import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Button,
  Callout,
  CounterRow,
  EmptyState,
  Screen,
  Sheet,
  StatGroup,
  StatRow,
  StepHeader,
  WaitState,
} from './index';

describe('Button', () => {
  it('defaults to type=button so it never submits a surrounding form by accident', () => {
    render(<Button>Votar</Button>);
    expect(screen.getByRole('button', { name: 'Votar' }).getAttribute('type')).toBe('button');
  });

  it('exposes the variant so a screen can be checked for two filled buttons', () => {
    render(
      <>
        <Button variant="primary">Cast</Button>
        <Button variant="link">Go back</Button>
      </>,
    );
    const filled = screen
      .getAllByRole('button')
      .filter((node) => node.getAttribute('data-variant') === 'primary');
    expect(filled).toHaveLength(1);
  });
});

describe('Screen', () => {
  it('keeps the pinned footer outside the scrolling body', () => {
    const { container } = render(
      <Screen header={<p>head</p>} footer={<Button>Continuar</Button>}>
        <p>body</p>
      </Screen>,
    );

    const body = container.querySelector('.sys-screen__body');
    const footer = container.querySelector('.sys-screen__footer');
    expect(body).not.toBeNull();
    expect(footer).not.toBeNull();
    // A footer nested inside the scroll area can cover the last line of copy.
    expect(body?.contains(footer as Node)).toBe(false);
    expect(within(footer as HTMLElement).getByRole('button', { name: 'Continuar' })).toBeTruthy();
  });
});

describe('StepHeader', () => {
  it('announces the full step label rather than leaving progress to the visual', () => {
    render(<StepHeader step={2} total={4} label="Paso 2 de 4" onClose={() => {}} />);
    expect(screen.getByText('Paso 2 de 4')).toBeTruthy();
  });

  it('omits the back control when there is nowhere to go back to', () => {
    render(<StepHeader step={1} total={4} label="Paso 1 de 4" closeLabel="Cerrar" />);
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
  });
});

describe('Sheet', () => {
  it('renders nothing while closed', () => {
    render(
      <Sheet open={false} title="Solicitud de prueba" onClose={() => {}}>
        <p>contents</p>
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('labels the dialog with its own title', () => {
    render(
      <Sheet open title="Solicitud de prueba" onClose={() => {}}>
        <p>contents</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Solicitud de prueba' })).toBeTruthy();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Sheet open title="Confirmar" onClose={onClose}>
        <p>contents</p>
      </Sheet>,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab inside the panel instead of letting focus escape to the page', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">outside</button>
        <Sheet open title="Confirmar" onClose={() => {}} actions={<Button>Generar prueba</Button>}>
          <p>contents</p>
        </Sheet>
      </>,
    );

    const dialog = screen.getByRole('dialog');
    const outside = screen.getByRole('button', { name: 'outside' });

    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(document.activeElement).not.toBe(outside);
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('returns focus to the control that opened it', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir
          </button>
          <Sheet open={open} title="Confirmar" onClose={() => setOpen(false)}>
            <p>contents</p>
          </Sheet>
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await user.click(opener);
    expect(screen.getByRole('dialog')).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

describe('StatRow', () => {
  it('renders a labelled group of facts', () => {
    render(
      <StatGroup label="Se verifica">
        <StatRow label="Edad" value="18+" />
        <StatRow label="Una sola vez" value="Sí" />
      </StatGroup>,
    );
    expect(screen.getByText('Se verifica')).toBeTruthy();
    expect(screen.getByText('Edad')).toBeTruthy();
    expect(screen.getByText('18+')).toBeTruthy();
  });
});

describe('CounterRow', () => {
  it('marks at most one counter as live', () => {
    const { container } = render(
      <CounterRow
        counters={[
          { id: 'open', label: 'abiertas', count: 5, live: true },
          { id: 'closed', label: 'cerradas', count: 12 },
        ]}
      />,
    );
    expect(container.querySelectorAll('.sys-counter--live')).toHaveLength(1);
  });

  it('renders nothing rather than an empty strip when there is nothing to count', () => {
    const { container } = render(<CounterRow counters={[]} />);
    expect(container.querySelector('.sys-counters')).toBeNull();
  });
});

describe('Callout', () => {
  it('carries its tone as data rather than only as colour', () => {
    const { container } = render(<Callout tone="warning">Algo que deberías saber</Callout>);
    expect(container.querySelector('[data-tone="warning"]')).toBeTruthy();
  });

  it('only takes an aria role when the caller asks for one', () => {
    const { container } = render(<Callout>Una nota estable</Callout>);
    expect(container.querySelector('[role]')).toBeNull();
  });
});

describe('EmptyState', () => {
  it('says one thing', () => {
    render(<EmptyState message="No hay consultas abiertas" />);
    expect(screen.getByText('No hay consultas abiertas')).toBeTruthy();
  });
});

describe('WaitState', () => {
  it('reports observed batch progress', () => {
    render(
      <WaitState
        status="pending"
        count={12}
        total={16}
        unitLabel="anotados"
        deadlineLabel="Como máximo"
        deadlineValue="16:45"
      />,
    );

    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('12');
    expect(bar.getAttribute('aria-valuemax')).toBe('16');
    expect(screen.getByText('16:45')).toBeTruthy();
  });

  it('never implies progress it cannot observe', () => {
    const { container } = render(
      <WaitState
        status="unknown"
        count={null}
        total={16}
        unitLabel="anotados"
        deadlineLabel="Como máximo"
        deadlineValue="16:45"
      />,
    );

    // A dash, not a zero: we observed nothing, not "no progress".
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
    expect(container.querySelector('.sys-wait__fill')).toBeNull();
    // The deadline is configuration, so it stays knowable when the count is not.
    expect(screen.getByText('16:45')).toBeTruthy();
  });
});
