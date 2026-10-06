import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from '../components/Alert';
const meta = { title: 'SE/SharedAlert', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const AppointmentNotice: Story = { render: () => <section style={{ maxWidth: 640 }}><h2>Appointment workspace</h2><Alert title="Demo appointment" variant="info">A synthetic follow-up appointment is awaiting confirmation.</Alert></section> };
export const PortalNotice: Story = { render: () => <section style={{ maxWidth: 375 }}><h2>Patient portal preview</h2><Alert title="Demo appointment" variant="info">A synthetic follow-up appointment is awaiting confirmation.</Alert></section> };
