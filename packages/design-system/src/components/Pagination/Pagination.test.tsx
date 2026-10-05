import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Pagination } from './Pagination';

test('disables Previous on the first page', () => {
  render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Previous' }).disabled).toBe(true);
});

test('requests the next page', () => {
  const onPageChange = vi.fn();
  render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(onPageChange).toHaveBeenCalledWith(3);
});
