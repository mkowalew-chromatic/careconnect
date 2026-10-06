import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from '../components/Alert';
const meta = { title: 'SE/AccessibleAction', parameters: { layout: 'padded', a11y: { test: 'error' } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const DismissNotice: Story = { render: () => <section style={{ maxWidth: 640 }}><Alert title="Demo notice" variant="info" action={<button type="button"><span aria-hidden="true">×</span></button>}>This fixture checks the accessible name of the dismiss action.</Alert></section> };
