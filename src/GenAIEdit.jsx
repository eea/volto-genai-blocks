import Icon from '@plone/volto/components/theme/Icon/Icon';
import Api from '@plone/volto/helpers/Api/Api';
import { flattenToAppURL } from '@plone/volto/helpers/Url/Url';
import config from '@plone/volto/registry';
import cx from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { Checkbox, Popup, TextArea } from 'semantic-ui-react';
import genaiSVG from './icons/genai.svg';
import './style.less';

const messages = defineMessages({
  close: { id: 'Close', defaultMessage: 'Close' },
  submit: { id: 'Submit', defaultMessage: 'Submit' },
  rewriteTitle: { id: 'Rewrite with AI', defaultMessage: 'Rewrite with AI' },
  autoRewrite: { id: 'Auto rewrite', defaultMessage: 'Auto rewrite' },
  makeShorter: { id: 'Make it shorter', defaultMessage: 'Make it shorter' },
  makeProfessional: {
    id: 'Make it more professional',
    defaultMessage: 'Make it more professional',
  },
  makeLonger: { id: 'Make it longer', defaultMessage: 'Make it longer' },
  fixSpelling: {
    id: 'Fix spelling & grammar',
    defaultMessage: 'Fix spelling & grammar',
  },
  rewritePlaceholder: {
    id: 'Make it to be...',
    defaultMessage: 'Make it to be...',
  },
  generateTitle: { id: 'Generate with AI', defaultMessage: 'Generate with AI' },
  multipleBlocks: { id: 'Multiple blocks', defaultMessage: 'Multiple blocks' },
  multiHelp: {
    id: 'Generate several blocks at once',
    defaultMessage: 'Generate several blocks at once',
  },
  singleHelp: {
    id: 'Replace this block',
    defaultMessage: 'Replace this block',
  },
  generatePlaceholder: {
    id: 'Describe what to generate...',
    defaultMessage: 'Describe what to generate...',
  },
});

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
          type="button"
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
  const intl = useIntl();
  const closeLabel = intl.formatMessage(messages.close);
  return (
    <div className="genai-card">
      <div className="genai-card-header">
        <Icon name={genaiSVG} size="14px" />
        <span>{title}</span>
        <button
          className="genai-close"
          onClick={onClose}
          title={closeLabel}
          aria-label={closeLabel}
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
  const intl = useIntl();
  const submitLabel = intl.formatMessage(messages.submit);
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
        title={submitLabel}
        aria-label={submitLabel}
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
    inputRef.current?.ref?.current?.focus?.({ preventScroll: true });
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
  const intl = useIntl();
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
      label: intl.formatMessage(messages.autoRewrite),
      style: 'presented in different wording',
    },
    {
      icon: '↘',
      label: intl.formatMessage(messages.makeShorter),
      style: 'shorter',
    },
    {
      icon: '💼',
      label: intl.formatMessage(messages.makeProfessional),
      style: 'more professional',
    },
    {
      icon: '↗',
      label: intl.formatMessage(messages.makeLonger),
      style: 'longer',
    },
    {
      icon: '✓',
      label: intl.formatMessage(messages.fixSpelling),
      style: 'presented with fixed spelling & grammar',
    },
  ];

  return (
    <GenAICard
      title={intl.formatMessage(messages.rewriteTitle)}
      onClose={() => setOpen(false)}
    >
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
        placeholder={intl.formatMessage(messages.rewritePlaceholder)}
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
  const intl = useIntl();
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
      title={intl.formatMessage(messages.generateTitle)}
      onClose={() => setOpen(false)}
      footer={
        <>
          <Checkbox
            checked={genType === 'Multi'}
            label={intl.formatMessage(messages.multipleBlocks)}
            onClick={() =>
              setGenType(genType === 'Single' ? 'Multi' : 'Single')
            }
            toggle
          />
          <span className="genai-help">
            {genType === 'Multi'
              ? intl.formatMessage(messages.multiHelp)
              : intl.formatMessage(messages.singleHelp)}
          </span>
        </>
      }
    >
      <PromptInput
        inputRef={inputRef}
        value={prompt}
        onChange={setPrompt}
        onSubmit={submit}
        placeholder={intl.formatMessage(messages.generatePlaceholder)}
      />
    </GenAICard>
  );
}

export default getGenAIEdit;
