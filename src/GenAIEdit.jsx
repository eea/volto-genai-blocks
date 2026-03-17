import { useEffect, useRef, useState } from 'react';
import cx from 'classnames';
import { Input, Popup, Checkbox } from 'semantic-ui-react';
import { Api } from '@plone/volto/helpers';
import { Icon } from '@plone/volto/components';
import { flattenToAppURL } from '@plone/volto/helpers';
import genaiSVG from './icons/genai.svg';
import './style.less';

function getGenAIEdit(Edit) {
  return (props) => {
    const { selected } = props;
    const [loading, setLoading] = useState(false);
    const [genType, setGenType] = useState('Single');

    useEffect(() => {
      if (!selected) {
        setGenType('Single');
      }
    }, [selected]);

    return (
      <>
        <Edit {...props} />
        {selected && (
          <Popup
            content={
              <GenAI
                {...props}
                loading={loading}
                genType={genType}
                setLoading={setLoading}
                setGenType={setGenType}
              />
            }
            className="genai-popup"
            on="click"
            pinned
            disabled={loading}
            trigger={
              <button className="genai-button">
                <Icon name={genaiSVG} size="14px" />
              </button>
            }
          />
        )}
        {selected && <div className={cx('genai-loader', { loading })} />}
      </>
    );
  };
}

function GenAI(props) {
  const {
    data,
    genType,
    id,
    loading,
    properties,
    onChangeBlock,
    onChangeFormData,
    setGenType,
    setLoading,
  } = props;
  const inputRef = useRef();
  const api = useRef(new Api());
  const path = flattenToAppURL(properties['@id']);
  const isEmptySlate = data['@type'] === 'slate' && !data['plaintext'];

  async function rewrite(style) {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const response = await api.current.post(`${path}/@llm-rewrite-blocks`, {
        data: {
          block: data,
          style,
        },
      });
      setLoading(false);
      if (response?.block) {
        onChangeBlock(id, response.block);
      }
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => {
    inputRef.current?.inputRef.current.focus({ preventScroll: true });
  }, []);

  return (
    <>
      {!isEmptySlate && (
        <>
          <div className="genai-actions">
            <button
              className="genai-action"
              onClick={() => rewrite('presented in different wording')}
            >
              <span className="genai-action-icon">✨</span>
              Auto rewrite
            </button>
            <button className="genai-action" onClick={() => rewrite('shorter')}>
              <span className="genai-action-icon">↘</span>
              Make it shorter
            </button>
            <button
              className="genai-action"
              onClick={() => rewrite('more professional')}
            >
              <span className="genai-action-icon">💼</span>
              Make it more professional
            </button>
            <button className="genai-action" onClick={() => rewrite('longer')}>
              <span className="genai-action-icon">↗</span>
              Make it longer
            </button>
            <button
              className="genai-action"
              onClick={() => rewrite('presented with fixed spelling & grammar')}
            >
              <span className="genai-action-icon">✓</span>
              Fix spelling & grammar
            </button>
          </div>
          <Input
            ref={inputRef}
            placeholder="Make it to be..."
            className="genai-generate-input"
            style={{ marginTop: '4px' }}
            onKeyUp={async (e) => {
              if (e.key === 'Enter') {
                rewrite(e.target.value);
              }
            }}
          />
        </>
      )}
      {isEmptySlate && (
        <div className="genai-generate">
          <Input
            ref={inputRef}
            placeholder="Ask Gen AI to generate..."
            className="genai-generate-input"
            label={
              <Checkbox
                value={genType === 'Multi'}
                label="Multi"
                onClick={() => {
                  if (genType === 'Single') {
                    setGenType('Multi');
                  } else {
                    setGenType('Single');
                  }
                }}
                toggle
              />
            }
            labelPosition="right corner"
            onKeyUp={async (e) => {
              if (e.key === 'Enter') {
                setLoading(true);
                try {
                  const response = await api.current.post(
                    `${path}/@llm-generate-blocks`,
                    {
                      data: {
                        prompt: e.target.value,
                        ...(genType === 'Single'
                          ? { block_type: data['@type'] }
                          : {}),
                      },
                    },
                  );
                  setLoading(false);
                  if (genType === 'Single' && response?.block) {
                    onChangeBlock(id, response.block);
                  }
                  if (
                    genType === 'Multi' &&
                    response?.blocks &&
                    response?.blocks_layout
                  ) {
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
            }}
          />
        </div>
      )}
    </>
  );
}

export default getGenAIEdit;
