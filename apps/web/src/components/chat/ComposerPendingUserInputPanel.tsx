import { type RuntimeRequestId, type ScopedThreadRef } from "@marp/contracts";
import { markdownProseDirection, textDirection } from "~/textDirection";
import { memo, use, useEffect, useEffectEvent, useRef, useState } from "react";
import { BackgroundThreadContext } from "./backgroundThread";
import { useStableCallback } from "~/hooks/useStableCallback";
import { type PendingUserInput } from "../../session-logic";
import type { PendingUserInputDraftAnswer } from "@marp/client-runtime/state/pending-user-input";
import { derivePendingUserInputProgress } from "../../pendingUserInput";
import { CheckboxMark } from "../ui/checkbox";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";
import { cn } from "~/lib/utils";
import { isInSideChatPane } from "~/lib/sideChatPane";
import { ComposerBanner } from "./ComposerBanner";
import { questionShortcutOptionIndex } from "./decisionCardKeys";
import ChatMarkdown from "../ChatMarkdown";

interface PendingUserInputPanelProps {
  pendingUserInputs: PendingUserInput[];
  cwd: string | undefined;
  threadRef: ScopedThreadRef;
  disabled?: boolean;
  respondingRequestIds: RuntimeRequestId[];
  answers: Record<string, PendingUserInputDraftAnswer>;
  questionIndex: number;
  onToggleOption: (questionId: string, optionValue: string) => void;
  onAdvance: () => void;
  onDismiss: (requestId: RuntimeRequestId) => void;
  /** Moves focus to the composer, where a custom answer is typed. */
  onOther?: (() => void) | undefined;
}

export const ComposerPendingUserInputPanel = memo(function ComposerPendingUserInputPanel({
  pendingUserInputs,
  cwd,
  threadRef,
  disabled = false,
  respondingRequestIds,
  answers,
  questionIndex,
  onToggleOption,
  onAdvance,
  onDismiss,
  onOther,
}: PendingUserInputPanelProps) {
  if (pendingUserInputs.length === 0) return null;
  const activePrompt = pendingUserInputs[0];
  if (!activePrompt) return null;

  return (
    <ComposerPendingUserInputCard
      key={activePrompt.requestId}
      prompt={activePrompt}
      cwd={cwd}
      threadRef={threadRef}
      disabled={disabled}
      isResponding={respondingRequestIds.includes(activePrompt.requestId)}
      answers={answers}
      questionIndex={questionIndex}
      onToggleOption={onToggleOption}
      onAdvance={onAdvance}
      onDismiss={onDismiss}
      onOther={onOther}
    />
  );
});

const ComposerPendingUserInputCard = memo(function ComposerPendingUserInputCard({
  prompt,
  cwd,
  threadRef,
  disabled,
  isResponding,
  answers,
  questionIndex,
  onToggleOption,
  onAdvance,
  onDismiss,
  onOther,
}: {
  onOther: (() => void) | undefined;
  prompt: PendingUserInput;
  cwd: string | undefined;
  threadRef: ScopedThreadRef;
  disabled: boolean;
  isResponding: boolean;
  answers: Record<string, PendingUserInputDraftAnswer>;
  questionIndex: number;
  onToggleOption: (questionId: string, optionValue: string) => void;
  onAdvance: () => void;
  onDismiss: (requestId: RuntimeRequestId) => void;
}) {
  // Message-mode requests remain answerable after their provider turn ends.
  const canRespond = prompt.responseCapability !== "not_resumable";
  const responseDisabled = disabled || isResponding || !canRespond;
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const advance = useStableCallback(onAdvance);
  const [optimisticSingleSelect, setOptimisticSingleSelect] = useState<{
    questionId: string;
    optionValue: string;
  } | null>(null);
  const [collapsedQuestionId, setCollapsedQuestionId] = useState<string | null>(null);
  // Keep question identity stable for its shortcut listener.
  const progress = derivePendingUserInputProgress(prompt.questions, answers, questionIndex);
  const activeQuestion = progress.activeQuestion;
  const customAnswerActive = progress.customAnswer.trim().length > 0;
  // Read before later hooks to preserve the question's compiler cache.
  const draftSelectedOptions = activeQuestion?.options.map(
    (option) =>
      !customAnswerActive && progress.selectedOptionValues.includes(option.value ?? option.label),
  );
  const isCollapsed = collapsedQuestionId !== null && collapsedQuestionId === activeQuestion?.id;

  if (
    optimisticSingleSelect &&
    activeQuestion &&
    !activeQuestion.multiSelect &&
    (optimisticSingleSelect.questionId !== activeQuestion.id ||
      (!customAnswerActive &&
        progress.selectedOptionValues.includes(optimisticSingleSelect.optionValue)))
  ) {
    setOptimisticSingleSelect(null);
  }

  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- clears the auto-advance timer when the question changes, input is disabled, or the panel unmounts
  useEffect(() => {
    const clearAutoAdvance = () => {
      if (autoAdvanceTimerRef.current !== null) {
        window.clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
    if (disabled || activeQuestion?.id === undefined) clearAutoAdvance();
    return clearAutoAdvance;
  }, [activeQuestion?.id, disabled]);

  const handleOptionSelection = (questionId: string, optionValue: string) => {
    if (disabled || isResponding) return;
    if (activeQuestion?.multiSelect) {
      onToggleOption(questionId, optionValue);
      return;
    }
    setOptimisticSingleSelect({ questionId, optionValue });
    onToggleOption(questionId, optionValue);
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
    }
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      advance();
    }, 200);
  };

  const selectOptionFromShortcut = useEffectEvent(handleOptionSelection);
  const backgroundThread = use(BackgroundThreadContext);

  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- subscribes a document keydown listener for digit shortcuts while a question is answerable
  useEffect(() => {
    if (!activeQuestion || responseDisabled || isCollapsed || backgroundThread) return;
    const handler = (event: globalThis.KeyboardEvent) => {
      if (isInSideChatPane(event.target)) return;
      const optionIndex = questionShortcutOptionIndex(event, activeQuestion.options.length);
      if (optionIndex === null) return;
      const option = activeQuestion.options[optionIndex];
      if (!option) return;
      event.preventDefault();
      selectOptionFromShortcut(activeQuestion.id, option.value ?? option.label);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeQuestion, backgroundThread, isCollapsed, responseDisabled]);

  if (!activeQuestion) {
    return null;
  }

  const promptDirection = markdownProseDirection(
    prompt.questions
      .flatMap((question) => [
        question.header,
        question.question,
        ...question.options.flatMap((option) => [option.label, option.description ?? ""]),
      ])
      .join(" "),
  );
  const questionTextAlign = promptDirection === "rtl" ? "text-right" : "text-left";

  return (
    <Collapsible
      dir={promptDirection}
      open={!isCollapsed}
      onOpenChange={(open) => {
        setCollapsedQuestionId(open ? null : activeQuestion.id);
      }}
    >
      <CollapsibleTrigger
        render={<ComposerBanner.Row render={<button type="button" />} />}
        title={
          isCollapsed ? "Show the question and its options" : "Hide the question and its options"
        }
        data-pending-user-input-toggle={isCollapsed ? "collapsed" : "expanded"}
        className="px-4 pt-1.5"
      >
        <ComposerBanner.Content>
          <span
            className={cn("min-w-0 truncate text-muted-foreground", isCollapsed && "max-w-1/2")}
            dir={textDirection(activeQuestion.header)}
          >
            {activeQuestion.header}
          </span>
          {isCollapsed ? (
            <>
              <ComposerBanner.Separator />
              <span
                className={cn("min-w-0 flex-1 truncate text-secondary-label", questionTextAlign)}
                dir={markdownProseDirection(activeQuestion.question)}
              >
                {activeQuestion.question}
              </span>
            </>
          ) : null}
        </ComposerBanner.Content>
        <ComposerBanner.Actions className="gap-0">
          {prompt.questions.length > 1 ? (
            <ComposerBanner.Count>
              {questionIndex + 1}/{prompt.questions.length}
            </ComposerBanner.Count>
          ) : null}
          <ComposerBanner.ToggleIcon expanded={!isCollapsed} />
          {prompt.dismissible ? (
            <ComposerBanner.Dismiss
              render={<span role="button" tabIndex={0} />}
              aria-label="Dismiss question without answering"
              title="Dismiss question without answering"
              disabled={isResponding}
              data-pending-user-input-dismiss
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDismiss(prompt.requestId);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                event.stopPropagation();
                onDismiss(prompt.requestId);
              }}
            />
          ) : null}
        </ComposerBanner.Actions>
      </CollapsibleTrigger>
      <CollapsiblePanel animate="fade">
        <ComposerBanner.Scroll>
          <ComposerBanner.Body className="ps-6 pe-4 pb-1 wrap-anywhere sm:ps-5.5">
            <ChatMarkdown
              text={activeQuestion.question}
              cwd={cwd}
              threadRef={threadRef}
              className={cn("pt-2 text-foreground/85", questionTextAlign)}
            />
            <div className="mt-2 flex flex-col gap-1.5">
              {activeQuestion.options.map((option, index) => {
                const optionValue = option.value ?? option.label;
                const isOptimisticallySelected =
                  optimisticSingleSelect?.questionId === activeQuestion.id &&
                  optimisticSingleSelect.optionValue === optionValue;
                const isSelected =
                  isOptimisticallySelected || draftSelectedOptions?.[index] === true;
                return (
                  <button
                    key={`${activeQuestion.id}:${optionValue}`}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={disabled || isResponding}
                    onClick={() => {
                      handleOptionSelection(activeQuestion.id, optionValue);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      isSelected
                        ? "bg-primary/10 ring-1 ring-inset ring-primary"
                        : "bg-muted hover:bg-surface-hover",
                      disabled || isResponding ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                    )}
                  >
                    {activeQuestion.multiSelect ? (
                      <span className="pointer-events-none flex shrink-0">
                        <CheckboxMark checked={isSelected} />
                      </span>
                    ) : null}
                    {index < 9 ? (
                      <span
                        aria-hidden
                        className="flex size-5 shrink-0 items-center justify-center rounded-md bg-card font-mono text-xs text-muted-foreground"
                      >
                        {index + 1}
                      </span>
                    ) : null}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span
                        className="text-sm font-semibold text-foreground"
                        dir={textDirection(option.label)}
                      >
                        {option.label}
                      </span>
                      {option.description && option.description !== option.label ? (
                        <span
                          className="text-xs text-muted-foreground"
                          dir={textDirection(option.description)}
                        >
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
              {onOther && activeQuestion.allowCustomAnswer !== false ? (
                <button
                  type="button"
                  disabled={disabled || isResponding}
                  onClick={onOther}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-field bg-muted px-3 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">Other…</span>
                    <span className="text-xs text-muted-foreground">
                      Type your own answer in the composer.
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
          </ComposerBanner.Body>
        </ComposerBanner.Scroll>
      </CollapsiblePanel>
    </Collapsible>
  );
});
