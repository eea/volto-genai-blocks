import { useEffect, useRef, useState } from 'react';
import cx from 'classnames';
import { Popup, Checkbox, TextArea } from 'semantic-ui-react';
import config from '@plone/volto/registry';
import { Api } from '@plone/volto/helpers';
import { Icon } from '@plone/volto/components';
import { flattenToAppURL } from '@plone/volto/helpers';
import genaiSVG from './icons/genai.svg';
import './style.less';

function getGenAIEdit(Edit) {
  return (props) => {
    const { selected, data } = props;
    const [loading, setLoading] = useState(false);
    const [genType, setGenType] = useState('Single');
    const [open, setOpen] = useState(false);
    const contextRef = useRef();

    useEffect(() => {
      if (!selected) {
        setGenType('Single');
        setOpen(false);
      }
    }, [selected]);

    const isCompatible =
      config.settings.genai?.compatibleBlocks?.includes(data['@type']) || false;

    if (!isCompatible || !selected) {
      return <Edit {...props} />;
    }

    return (
      <>
        <Edit {...props} />
        <button
          ref={contextRef}
          disabled={loading}
          onClick={() => setOpen(!open)}
          className="genai-button"
        >
          <Icon name={genaiSVG} size="14px" />
        </button>
        <Popup
          context={contextRef}
          content={
            <GenAI
              {...props}
              loading={loading}
              genType={genType}
              setLoading={setLoading}
              setGenType={setGenType}
              setOpen={setOpen}
            />
          }
          open={open}
          className="genai-popup"
          on="click"
          pinned
        />
        <div className={cx('genai-loader', { loading })} />
      </>
    );
  };
}

function GenAICard({ title, onClose, children, footer }) {
  return (
    <div className="genai-card">
      <div className="genai-card-header">
        <Icon name={genaiSVG} size="14px" />
        <span>{title}</span>
        <button
          className="genai-close"
          onClick={onClose}
          title="Close"
          aria-label="Close"
          type="button"
        >
          ×
        </button>
      </div>
      <div className="genai-card-body">{children}</div>
      {footer && <div className="genai-card-footer">{footer}</div>}
    </div>
  );
}

function PromptInput({ inputRef, value, onChange, onSubmit, placeholder }) {
  return (
    <div className="genai-prompt">
      <TextArea
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <button
        className="genai-submit"
        onClick={onSubmit}
        disabled={!value.trim()}
        title="Submit"
        aria-label="Submit"
        type="button"
      >
        ➤
      </button>
    </div>
  );
}

function GenAI(props) {
  const { data, id, loading, onChangeBlock, setLoading, setOpen } = props;
  const properties = props.metadata || props.properties;
  const inputRef = useRef();
  const api = useRef(new Api());
  const path = flattenToAppURL(properties['@id'] || properties.parent['@id']);
  const isEmptySlate = data['@type'] === 'slate' && !data['plaintext'];

  useEffect(() => {
    inputRef.current?.ref.current?.focus({ preventScroll: true });
  }, []);

  const Component = isEmptySlate ? GenAIGenerate : GenAIRewrite;

  return (
    <Component
      {...props}
      inputRef={inputRef}
      api={api}
      path={path}
      data={data}
      id={id}
      loading={loading}
      onChangeBlock={onChangeBlock}
      setLoading={setLoading}
      setOpen={setOpen}
    />
  );
}

function GenAIRewrite(props) {
  const {
    data,
    id,
    loading,
    onChangeBlock,
    setLoading,
    setOpen,
    inputRef,
    api,
    path,
  } = props;
  const [prompt, setPrompt] = useState('');

  async function rewrite(style) {
    if (loading || !style) return;
    setOpen(false);
    setLoading(true);
    try {
      const response = await api.current.post(`${path}/@llm-rewrite-blocks`, {
        data: { block: data, style },
      });
      setLoading(false);
      if (response?.block) {
        onChangeBlock(id, response.block);
      }
    } catch {
      setLoading(false);
    }
  }

  const actions = [
    {
      icon: '✨',
      label: 'Auto rewrite',
      style: 'presented in different wording',
    },
    { icon: '↘', label: 'Make it shorter', style: 'shorter' },
    {
      icon: '💼',
      label: 'Make it more professional',
      style: 'more professional',
    },
    { icon: '↗', label: 'Make it longer', style: 'longer' },
    {
      icon: '✓',
      label: 'Fix spelling & grammar',
      style: 'presented with fixed spelling & grammar',
    },
  ];

  return (
    <GenAICard title="Rewrite with AI" onClose={() => setOpen(false)}>
      <div className="genai-actions">
        {actions.map((a) => (
          <button
            key={a.label}
            className="genai-action"
            onClick={() => rewrite(a.style)}
            type="button"
          >
            <span className="genai-action-icon">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
      <div className="genai-card-divider" />
      <PromptInput
        inputRef={inputRef}
        value={prompt}
        onChange={setPrompt}
        onSubmit={() => rewrite(prompt.trim())}
        placeholder="Make it to be..."
      />
    </GenAICard>
  );
}

function GenAIGenerate(props) {
  const {
    data,
    genType,
    id,
    onChangeBlock,
    onChangeFormData,
    setGenType,
    setLoading,
    setOpen,
    inputRef,
    api,
    path,
  } = props;
  const properties = props.metadata || props.properties;
  const [prompt, setPrompt] = useState('');

  async function submit() {
    const value = prompt.trim();
    if (!value) return;
    setOpen(false);
    setLoading(true);
    try {
      const response = await api.current.post(`${path}/@llm-generate-blocks`, {
        data: {
          prompt: value,
          ...(genType === 'Single' ? { block_type: data['@type'] } : {}),
          properties,
        },
      });
      setLoading(false);
      if (genType === 'Single' && response?.block) {
        onChangeBlock(id, response.block);
      }
      if (genType === 'Multi' && response?.blocks && response?.blocks_layout) {
        const items = [...properties.blocks_layout.items];
        const idx = items.indexOf(id);
        items.splice(idx, 1, ...response.blocks_layout.items);
        onChangeFormData({
          ...properties,
          blocks: {
            ...properties.blocks,
            ...(response.blocks || {}),
          },
          blocks_layout: {
            items,
          },
        });
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <GenAICard
      title="Generate with AI"
      onClose={() => setOpen(false)}
      footer={
        <>
          <Checkbox
            checked={genType === 'Multi'}
            label="Multiple blocks"
            onClick={() =>
              setGenType(genType === 'Single' ? 'Multi' : 'Single')
            }
            toggle
          />
          <span className="genai-help">
            {genType === 'Multi'
              ? 'Generate several blocks at once'
              : 'Replace this block'}
          </span>
        </>
      }
    >
      <PromptInput
        inputRef={inputRef}
        value={prompt}
        onChange={setPrompt}
        onSubmit={submit}
        placeholder="Describe what to generate..."
      />
    </GenAICard>
  );
}

export default getGenAIEdit;
