import type { ReactNode } from 'react';
import './system.css';

export interface InstructionCardProps {
  /** The illustration or photograph. Decorative -- the title carries the meaning. */
  readonly media?: ReactNode;
  readonly title: string;
  /** One sentence. If it needs two, the screen is doing two things. */
  readonly body?: string;
  /** A contextual help affordance, shown at the point of need. */
  readonly aside?: ReactNode;
}

/**
 * Image, short title, one sentence.
 *
 * The unit RariMe's passport flow is built from, and the reason that flow needs
 * no help section: "Remove Case -- make sure you remove the case from the
 * device" is a help article reduced to the one moment it matters.
 */
export function InstructionCard({ media, title, body, aside }: InstructionCardProps) {
  return (
    <section className="sys-instruction">
      {media ? (
        <div className="sys-instruction__media" aria-hidden="true">
          {media}
        </div>
      ) : null}
      <div>
        <h2 className="sys-instruction__title">{title}</h2>
        {body ? <p className="sys-instruction__body">{body}</p> : null}
      </div>
      {aside}
    </section>
  );
}
