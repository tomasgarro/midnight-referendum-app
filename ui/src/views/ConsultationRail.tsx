import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import { type ReactNode, useRef, useState } from 'react';
import type { CicoLocale } from '@/integration/locale';

export function ConsultationRail({
  label,
  count,
  locale,
  children,
}: {
  label: string;
  count: number;
  locale: CicoLocale;
  children: ReactNode;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const move = (next: number) => {
    const list = rail.current;
    const target = list?.children[Math.max(0, Math.min(count - 1, next))] as
      | HTMLElement
      | undefined;
    const first = list?.children[0] as HTMLElement | undefined;
    if (list && target && first)
      list.scrollTo({
        left: target.offsetLeft - first.offsetLeft,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
  };
  return (
    <>
      {count > 1 && (
        <div className="discovery-carousel-nav">
          <span aria-live="polite">
            {index + 1} / {count}
          </span>
          <button
            type="button"
            aria-label={
              locale === 'en'
                ? 'Previous consultation'
                : locale === 'es'
                  ? 'Consulta anterior'
                  : 'Consultation précédente'
            }
            disabled={index === 0}
            onClick={() => move(index - 1)}
          >
            <ArrowLeft size={19} />
          </button>
          <button
            type="button"
            aria-label={
              locale === 'en'
                ? 'Next consultation'
                : locale === 'es'
                  ? 'Consulta siguiente'
                  : 'Consultation suivante'
            }
            disabled={index >= count - 1}
            onClick={() => move(index + 1)}
          >
            <ArrowRight size={19} />
          </button>
        </div>
      )}
      <ul
        className="votes__list discovery-rail"
        ref={rail}
        aria-label={label}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            move(index + (event.key === 'ArrowRight' ? 1 : -1));
          }
        }}
        onScroll={() => {
          const list = rail.current;
          const first = list?.children[0] as HTMLElement | undefined;
          const second = list?.children[1] as HTMLElement | undefined;
          if (list && first && second)
            setIndex(
              Math.max(
                0,
                Math.min(
                  count - 1,
                  Math.round(list.scrollLeft / (second.offsetLeft - first.offsetLeft || 1)),
                ),
              ),
            );
        }}
      >
        {children}
      </ul>
    </>
  );
}
