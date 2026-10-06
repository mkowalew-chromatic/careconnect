import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from '../components/Alert';
const meta = { title: 'SE/FocusedFeedback', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const NoticeSpacing: Story = { render: () => <section style={{ maxWidth: 640, padding: 16 }}><Alert title="Demo reminder" variant="info">This isolated story file owns its surrounding spacing.</Alert></section> };
