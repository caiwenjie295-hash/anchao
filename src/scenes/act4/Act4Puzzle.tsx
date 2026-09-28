import { useState } from "react";
import type { StateManager } from "../../core/stateManager";
import { act4Hints } from "../../story/act4/actions";

type Choice = { id: string; label: string };

export function Puzzle({
  id,
  title,
  choices,
  manager,
  solved,
  onSuccess,
  input,
}: {
  id: string;
  title: string;
  choices?: Choice[];
  manager: StateManager;
  solved: boolean;
  onSuccess?: () => void;
  input?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [notice, setNotice] = useState("");
  const submit = () => {
    const answer = input ? [typed.trim()] : selected;
    if (manager.solveAct4Puzzle(id, answer)) {
      setNotice("已确认。");
      onSuccess?.();
    } else {
      setAttempts((value) => value + 1);
      setNotice("还没有对上。可以保留选择继续核对，或重新选择。");
    }
  };
  return (
    <section className="a4-puzzle" aria-label={`${id} ${title}`}>
      <h3>
        {id} · {title} {solved && <span className="a4-done">已完成</span>}
      </h3>
      {!solved && (
        <>
          {input ? (
            <label>
              输入八位日期{" "}
              <input
                inputMode="numeric"
                maxLength={8}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
            </label>
          ) : (
            <>
              <p className="a4-selected">
                已选：
                {selected.length
                  ? selected
                      .map(
                        (value) =>
                          choices?.find((choice) => choice.id === value)?.label,
                      )
                      .join(" → ")
                  : "请按顺序点选"}
              </p>
              <div className="a4-choices">
                {choices?.map((choice) => (
                  <button
                    type="button"
                    key={choice.id}
                    onClick={() =>
                      setSelected((values) =>
                        values.includes(choice.id)
                          ? values
                          : [...values, choice.id],
                      )
                    }
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="a4-actions">
            <button type="button" onClick={submit}>
              确认线索
            </button>
            {!input && (
              <button
                type="button"
                onClick={() => {
                  setSelected([]);
                  setNotice("已清空选择。");
                }}
              >
                重新选择
              </button>
            )}
          </div>
          {attempts > 0 && (
            <p className="a4-hint">
              提示：{act4Hints[id]?.[Math.min(attempts - 1, 1)]}
            </p>
          )}
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
