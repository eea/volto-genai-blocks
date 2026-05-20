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
import { toast } from 'react-toastify';

import LLMSummaryWidget from './LLMSummaryWidget';

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

jest.mock('@plone/volto/components/manage/Widgets/TextareaWidget', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) =>
      React.createElement('textarea', {
        'aria-label': 'summary',
        value: props.value || '',
        onChange: (e) => props.onChange(props.id, e.target.value),
      }),
  };
});

jest.mock('react-redux', () => ({
  __esModule: true,
  useSelector: (selector) =>
    selector({ content: { data: { '@id': 'http://localhost/page' } } }),
}));

jest.mock('react-toastify', () => ({
  __esModule: true,
  toast: { success: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('./icons/genai.svg', () => 'genai.svg', { virtual: true });

const renderWidget = (props = {}) => {
  const onChange = jest.fn();
  render(
    <IntlProvider locale="en" messages={{}}>
      <LLMSummaryWidget
        id="llm_summary"
        title="Summary"
        value=""
        onChange={onChange}
        formData={{ title: 'Hello' }}
        {...props}
      />
    </IntlProvider>,
  );
  return { onChange };
};

describe('LLMSummaryWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the generate label when there is no value', () => {
    renderWidget();
    expect(screen.getByText('Generate AI summary')).toBeInTheDocument();
  });

  it('shows the regenerate label and hint when a value exists', () => {
    renderWidget({ value: 'existing summary' });
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Manual edits welcome. Regenerating overwrites current text.',
      ),
    ).toBeInTheDocument();
  });

  it('generates a summary and reports success', async () => {
    mockPost.mockResolvedValueOnce({ llm_summary: 'A fresh summary' });
    const { onChange } = renderWidget();

    await act(async () => {
      fireEvent.click(screen.getByText('Generate AI summary'));
    });

    expect(mockPost).toHaveBeenCalledWith(
      'http://localhost/page/@llm-summary',
      {
        data: { properties: { title: 'Hello' } },
      },
    );
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith('llm_summary', 'A fresh summary'),
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it('warns when the backend returns an empty summary', async () => {
    mockPost.mockResolvedValueOnce({ llm_summary: '   ' });
    const { onChange } = renderWidget();

    await act(async () => {
      fireEvent.click(screen.getByText('Generate AI summary'));
    });

    await waitFor(() => expect(toast.warn).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports an error when generation fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('boom'));
    renderWidget();

    await act(async () => {
      fireEvent.click(screen.getByText('Generate AI summary'));
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('asks for confirmation before overwriting an existing summary', async () => {
    renderWidget({ value: 'existing summary' });

    fireEvent.click(screen.getByText('Regenerate'));

    expect(screen.getByText('Regenerate AI summary?')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
