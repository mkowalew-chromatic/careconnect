import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppointmentsFilterBarDemo } from './AppointmentsFilterBar';
import { figmaDesign } from '../../figma/links';

const meta: Meta = { title: 'Clinical/AppointmentsFilterBar', parameters: { design: figmaDesign('Clinical/AppointmentsFilterBar') }, tags: ['autodocs'] };
export default meta;
type Story = StoryObj;

export const TrackingBoardFilters: Story = { render: () => <AppointmentsFilterBarDemo /> };
