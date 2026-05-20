import applyConfig from './index';
import LLMSummaryWidget from './LLMSummaryWidget';

jest.mock('./GenAIEdit', () => ({
  __esModule: true,
  default: (edit) => ({ wrappedEdit: edit }),
}));

jest.mock('./LLMSummaryWidget', () => ({
  __esModule: true,
  default: () => null,
}));

const makeConfig = () => ({
  blocks: {
    blocksConfig: {
      slate: { id: 'slate', edit: 'SlateEdit' },
      image: { id: 'image', edit: 'ImageEdit' },
    },
  },
  settings: {},
  widgets: { id: {} },
});

describe('applyConfig', () => {
  it('wraps every block edit with the GenAI editor', () => {
    const config = applyConfig(makeConfig());

    expect(config.blocks.blocksConfig.slate.edit).toEqual({
      wrappedEdit: 'SlateEdit',
    });
    expect(config.blocks.blocksConfig.image.edit).toEqual({
      wrappedEdit: 'ImageEdit',
    });
  });

  it('preserves other block config properties', () => {
    const config = applyConfig(makeConfig());

    expect(config.blocks.blocksConfig.slate.id).toBe('slate');
  });

  it('registers the list of compatible blocks', () => {
    const config = applyConfig(makeConfig());

    expect(config.settings.genai.compatibleBlocks).toEqual([
      'slate',
      'tabs_block',
      'columnsBlock',
    ]);
  });

  it('registers the LLM summary widget by id', () => {
    const config = applyConfig(makeConfig());

    expect(config.widgets.id.llm_summary).toBe(LLMSummaryWidget);
  });

  it('returns the same config object it received', () => {
    const config = makeConfig();

    expect(applyConfig(config)).toBe(config);
  });
});
