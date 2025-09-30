'use client';

import React, { createContext, useContext, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { ScreenReaderOnly, StatusMessage } from './ScreenReaderOnly';
import { getFormFieldProps } from '@/lib/accessibility/a11y-utils';

interface FormContextValue {
  formId: string;
  addField: (fieldId: string, required?: boolean) => void;
  removeField: (fieldId: string) => void;
  setFieldError: (fieldId: string, error: string | null) => void;
  errors: Record<string, string>;
  requiredFields: Set<string>;
}

const FormContext = createContext<FormContextValue | null>(null);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a Form component');
  }
  return context;
};

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  errors?: Record<string, string>;
  title?: string;
  description?: string;
  className?: string;
}

export function AccessibleForm({
  children,
  onSubmit,
  errors = {},
  title,
  description,
  className,
  ...props
}: FormProps) {
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>(errors);
  const [requiredFields] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const addField = (fieldId: string, required = false) => {
    if (required) {
      requiredFields.add(fieldId);
    }
  };

  const removeField = (fieldId: string) => {
    requiredFields.delete(fieldId);
    const newErrors = { ...fieldErrors };
    delete newErrors[fieldId];
    setFieldErrors(newErrors);
  };

  const setFieldError = (fieldId: string, error: string | null) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[fieldId] = error;
      } else {
        delete newErrors[fieldId];
      }
      return newErrors;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);

    try {
      if (onSubmit) {
        await onSubmit(e);
        setSubmitResult({
          type: 'success',
          message: 'Form inviato con successo'
        });
      }
    } catch (error) {
      setSubmitResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Errore durante l\'invio del form'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const allErrors = { ...errors, ...fieldErrors };
  const hasErrors = Object.keys(allErrors).length > 0;
  const errorCount = Object.keys(allErrors).length;

  return (
    <FormContext.Provider
      value={{
        formId,
        addField,
        removeField,
        setFieldError,
        errors: allErrors,
        requiredFields,
      }}
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        aria-describedby={description ? `${formId}-description` : undefined}
        aria-label={title}
        className={cn('space-y-6', className)}
        {...props}
      >
        {title && (
          <h2 className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
        )}

        {description && (
          <p id={`${formId}-description`} className="text-sm text-gray-600">
            {description}
          </p>
        )}

        {hasErrors && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-md bg-red-50 border border-red-200 p-4"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {errorCount === 1
                    ? 'C\'è un errore nel form'
                    : `Ci sono ${errorCount} errori nel form`}
                </h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                  {Object.entries(allErrors).map(([fieldId, error]) => (
                    <li key={fieldId}>
                      <a
                        href={`#${fieldId}`}
                        className="underline hover:no-underline focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
                        onClick={(e) => {
                          e.preventDefault();
                          const field = document.getElementById(fieldId);
                          if (field) {
                            field.focus();
                            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                      >
                        {error}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {submitResult && (
          <StatusMessage type={submitResult.type === 'error' ? 'alert' : 'status'}>
            {submitResult.message}
          </StatusMessage>
        )}

        <fieldset disabled={submitting} className="space-y-6">
          <ScreenReaderOnly>
            <legend>
              {title || 'Form'}
              {requiredFields.size > 0 && ` - ${requiredFields.size} campi obbligatori`}
            </legend>
          </ScreenReaderOnly>
          {children}
        </fieldset>

        {submitting && (
          <StatusMessage>
            Invio del form in corso, attendere...
          </StatusMessage>
        )}
      </form>
    </FormContext.Provider>
  );
}

// Enhanced form field component
interface FormFieldProps {
  children: React.ReactNode;
  label?: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export function FormField({
  children,
  label,
  error,
  description,
  required = false,
  className,
}: FormFieldProps) {
  const fieldId = useId();
  const { addField, removeField } = useFormContext();

  React.useEffect(() => {
    addField(fieldId, required);
    return () => removeField(fieldId);
  }, [fieldId, required, addField, removeField]);

  const fieldProps = getFormFieldProps(fieldId, label, error, description, required);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={fieldProps.id}
          className={cn(
            'block text-sm font-medium text-gray-700',
            required && 'after:content-["*"] after:ml-1 after:text-red-500'
          )}
        >
          {label}
          {required && (
            <ScreenReaderOnly>(obbligatorio)</ScreenReaderOnly>
          )}
        </label>
      )}

      {description && (
        <p id={fieldProps.descriptionId} className="text-sm text-gray-500">
          {description}
        </p>
      )}

      {React.cloneElement(children as React.ReactElement, {
        id: fieldProps.id,
        'aria-labelledby': fieldProps.labelId,
        'aria-describedby': fieldProps['aria-describedby'],
        'aria-invalid': fieldProps['aria-invalid'],
        'aria-required': fieldProps['aria-required'],
      })}

      {error && (
        <p
          id={fieldProps.errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          <span className="sr-only">Errore: </span>
          {error}
        </p>
      )}
    </div>
  );
}