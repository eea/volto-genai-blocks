import getGenAIEdit from './GenAIEdit';

const applyConfig = (config) => {
  Object.keys(config.blocks.blocksConfig).forEach((id) => {
    config.blocks.blocksConfig[id] = {
      ...config.blocks.blocksConfig[id],
      edit: getGenAIEdit(config.blocks.blocksConfig[id].edit),
    };
  });
  return config;
};

export default applyConfig;
