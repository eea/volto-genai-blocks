import React from 'react';
import { IntlProvider } from 'react-intl';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';

import getGenAIEdit from './GenAIEdit';

const mockPost = jest.fn();

jest.mock('@plone/volto/helpers/Api/Api', () => ({
  __esModule: true,
  default: jest.fn(() => ({ post: mockPost })),
}));

jest.mock('@plone/volto/helpers/Url/Url', () => ({
  __esModule: true,
  flattenToAppURL: (url) => url,
}));

jest.mock('@plone/volto/components/theme/Icon/Icon', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('span', null, 'Icon'),
  };
});

jest.mock('@plone/volto/registry', () => ({
  __esModule: true,
  default: { settings: { genai: { compatibleBlocks: ['slate'] } } },
}));

jest.mock('semantic-ui-react', () => {
  const React = require('react');
  return {
    __esModule: true,
    Popup: ({ content, open }) =>
      open ? React.createElement('div', null, content) : null,
    Checkbox: ({ label }) => React.createElement('span', null, label),
    TextArea: React.forwardRef((props, ref) =>
      React.createElement('textarea', { ref, ...props }),
    ),
  };
});

jest.mock('./icons/genai.svg', () => 'genai.svg', { virtual: true });

const Edit = () => <div>WrappedEditBlock</div>;
const GenAIEdit = getGenAIEdit(Edit);

const renderEdit = (props = {}) => {
  const onChangeBlock = jest.fn();
  const onChangeFormData = jest.fn();
  render(
    <IntlProvider locale="en" messages={{}}>
      <GenAIEdit
        selected
        id="block-1"
        data={{ '@type': 'slate' }}
        properties={{
          '@id': '/page',
          blocks: {},
          blocks_layout: { items: [] },
        }}
        onChangeBlock={onChangeBlock}
        onChangeFormData={onChangeFormData}
        {...props}
      />
    </IntlProvider>,
  );
  return { onChangeBlock, onChangeFormData };
};

describe('getGenAIEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders only the wrapped edit for incompatible blocks', () => {
    renderEdit({ data: { '@type': 'image' } });

    expect(screen.getByText('WrappedEditBlock')).toBeInTheDocument();
    expect(document.querySelector('.genai-button')).toBeNull();
  });

  it('renders only the wrapped edit when the block is not selected', () => {
    renderEdit({ selected: false });

    expect(screen.getByText('WrappedEditBlock')).toBeInTheDocument();
    expect(document.querySelector('.genai-button')).toBeNull();
  });

  it('renders the GenAI trigger for a compatible, selected block', () => {
    renderEdit();

    expect(screen.getByText('WrappedEditBlock')).toBeInTheDocument();
    expect(document.querySelector('.genai-button')).not.toBeNull();
  });

  it('opens the generate card for an empty slate block', () => {
    renderEdit({ data: { '@type': 'slate' } });

    fireEvent.click(document.querySelector('.genai-button'));

    expect(screen.getByText('Generate with AI')).toBeInTheDocument();
  });

  it('opens the rewrite card for a slate block with content', () => {
    renderEdit({ data: { '@type': 'slate', plaintext: 'Some text' } });

    fireEvent.click(document.querySelector('.genai-button'));

    expect(screen.getByText('Rewrite with AI')).toBeInTheDocument();
    expect(screen.getByText('Auto rewrite')).toBeInTheDocument();
  });

  it('rewrites a block via the backend and applies the result', async () => {
    mockPost.mockResolvedValueOnce({
      block: { '@type': 'slate', plaintext: 'shorter' },
    });
    const { onChangeBlock } = renderEdit({
      data: { '@type': 'slate', plaintext: 'Some text' },
    });

    fireEvent.click(document.querySelector('.genai-button'));
    await act(async () => {
      fireEvent.click(screen.getByText('Make it shorter'));
    });

    expect(mockPost).toHaveBeenCalledWith('/page/@llm-rewrite-blocks', {
      data: {
        block: { '@type': 'slate', plaintext: 'Some text' },
        style: 'shorter',
      },
    });
    await waitFor(() =>
      expect(onChangeBlock).toHaveBeenCalledWith('block-1', {
        '@type': 'slate',
        plaintext: 'shorter',
      }),
    );
  });

  it('generates a single block via the backend and applies the result', async () => {
    mockPost.mockResolvedValueOnce({
      block: { '@type': 'slate', plaintext: 'generated' },
    });
    const { onChangeBlock } = renderEdit({ data: { '@type': 'slate' } });

    fireEvent.click(document.querySelector('.genai-button'));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'a poem about clouds' },
    });
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    });

    expect(mockPost).toHaveBeenCalledWith('/page/@llm-generate-blocks', {
      data: {
        prompt: 'a poem about clouds',
        block_type: 'slate',
        properties: {
          '@id': '/page',
          blocks: {},
          blocks_layout: { items: [] },
        },
      },
    });
    await waitFor(() =>
      expect(onChangeBlock).toHaveBeenCalledWith('block-1', {
        '@type': 'slate',
        plaintext: 'generated',
      }),
    );
  });
});
