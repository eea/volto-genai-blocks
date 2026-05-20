import getGenAIEdit from './GenAIEdit';
import LLMSummaryWidget from './LLMSummaryWidget';

const applyConfig = (config) => {
  Object.keys(config.blocks.blocksConfig).forEach((id) => {
    config.blocks.blocksConfig[id] = {
      ...config.blocks.blocksConfig[id],
      edit: getGenAIEdit(config.blocks.blocksConfig[id].edit),
    };
  });
  config.settings.genai = {
    compatibleBlocks: ['slate', 'tabs_block', 'columnsBlock'],
  };
  config.widgets.id.llm_summary = LLMSummaryWidget;
  return config;
};

export default applyConfig;
