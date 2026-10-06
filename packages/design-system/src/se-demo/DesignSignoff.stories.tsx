import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../components/Button';
const meta = { title: 'SE/DesignSignoff', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const AppointmentDecision: Story = { render: () => <section style={{ maxWidth: 480, padding: 24 }}><h2>Demo appointment</h2><p>Review the appointment decision layout.</p><div style={{ display: 'flex', gap: 8 }}><Button>Confirm appointment</Button><Button variant="secondary">Reschedule</Button></div></section> };
