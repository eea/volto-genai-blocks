import Icon from '@plone/volto/components/theme/Icon/Icon';
import TextareaWidget from '@plone/volto/components/manage/Widgets/TextareaWidget';
import Api from '@plone/volto/helpers/Api/Api';
import { flattenToAppURL } from '@plone/volto/helpers/Url/Url';
import { useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { Button, Confirm } from 'semantic-ui-react';
import genaiSVG from './icons/genai.svg';

const messages = defineMessages({
  generated: {
    id: 'AI summary generated',
    defaultMessage: 'AI summary generated',
  },
  empty: {
    id: 'Empty summary returned',
    defaultMessage: 'Empty summary returned',
  },
  failed: {
    id: 'Summary generation failed: {error}',
    defaultMessage: 'Summary generation failed: {error}',
  },
  regenerate: { id: 'Regenerate', defaultMessage: 'Regenerate' },
  generate: {
    id: 'Generate AI summary',
    defaultMessage: 'Generate AI summary',
  },
  hint: {
    id: 'Manual edits welcome. Regenerating overwrites current text.',
    defaultMessage:
      'Manual edits welcome. Regenerating overwrites current text.',
  },
  confirmHeader: {
    id: 'Regenerate AI summary?',
    defaultMessage: 'Regenerate AI summary?',
  },
  confirmContent: {
    id: 'This will overwrite the current summary with a freshly generated one.',
    defaultMessage:
      'This will overwrite the current summary with a freshly generated one.',
  },
  cancel: { id: 'Cancel', defaultMessage: 'Cancel' },
});

const LLMSummaryWidget = (props) => {
  const { id, value, onChange } = props;
  const intl = useIntl();
  const properties = props.formData;
  const contentId = useSelector((state) => state.content?.data?.['@id']);
  const api = useRef(new Api());
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasValue = value?.trim();

  async function generate() {
    if (!contentId || loading) return;
    setLoading(true);
    try {
      const path = flattenToAppURL(contentId);
      const response = await api.current.post(`${path}/@llm-summary`, {
        data: {
          properties,
        },
      });
      const summary = response?.llm_summary;
      if (summary?.trim()) {
        onChange(id, summary);
        toast.success(intl.formatMessage(messages.generated));
      } else {
        toast.warn(intl.formatMessage(messages.empty));
      }
    } catch (err) {
      toast.error(
        intl.formatMessage(messages.failed, { error: err?.message || err }),
      );
    } finally {
      setLoading(false);
    }
  }

  function onClickButton() {
    if (hasValue) {
      setConfirmOpen(true);
    } else {
      generate();
    }
  }

  return (
    <div className="llm-summary-widget">
      <TextareaWidget {...props} />
      <div className="llm-summary-actions">
        <Button
          type="button"
          size="tiny"
          basic
          primary
          disabled={loading || !contentId}
          loading={loading}
          onClick={onClickButton}
        >
          <Icon name={genaiSVG} size="14px" />
          <span>
            {hasValue
              ? intl.formatMessage(messages.regenerate)
              : intl.formatMessage(messages.generate)}
          </span>
        </Button>
        {hasValue && (
          <span className="llm-summary-hint">
            {intl.formatMessage(messages.hint)}
          </span>
        )}
      </div>
      <Confirm
        open={confirmOpen}
        header={intl.formatMessage(messages.confirmHeader)}
        content={intl.formatMessage(messages.confirmContent)}
        cancelButton={intl.formatMessage(messages.cancel)}
        confirmButton={intl.formatMessage(messages.regenerate)}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          generate();
        }}
      />
    </div>
  );
};

export default LLMSummaryWidget;
