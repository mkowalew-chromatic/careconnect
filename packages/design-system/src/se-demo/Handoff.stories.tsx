import type { Meta, StoryObj } from '@storybook/react-vite';
import { PatientBanner } from '../components/PatientBanner';
const meta = { title: 'SE/Handoff', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const PatientHandoff: Story = {
  render: () => <section data-se-handoff aria-label="Synthetic patient handoff" style={{ maxWidth: 720 }}>
    <style>{'[data-se-handoff] .cc-patient-banner__alerts { visibility: visible; }'}</style>
    <PatientBanner name="Demo Patient" mrn="DEMO-0001" dob="01/01/1985" age={41} sex="Not specified" alerts={['Demo warning']} />
  </section>,
};
