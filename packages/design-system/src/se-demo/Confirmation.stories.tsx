import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Modal } from '../components/Modal';
function Confirmation() {
  const [confirmed, setConfirmed] = useState(false);
  return confirmed ? <p role="status">Appointment confirmed</p> : <Modal open title="Confirm demo appointment?" confirmLabel="Confirm appointment" onClose={() => {}} onConfirm={() => setConfirmed(true)}>This is a synthetic appointment. No API request is made.</Modal>;
}
const meta = { title: 'SE/Confirmation', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const ConfirmAppointment: Story = {
  render: () => <Confirmation />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm appointment' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Appointment confirmed');
  },
};
