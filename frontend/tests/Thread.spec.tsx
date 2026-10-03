import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ThreadPage from '@/pages/Thread';

import { unavailableThreadIdState } from '@chainlit/react-client';

const { mockThreadId } = vi.hoisted(() => ({ mockThreadId: vi.fn() }));

vi.mock('@chainlit/react-client', async () => {
  const { atom } = await vi.importActual<typeof import('recoil')>('recoil');
  return {
    unavailableThreadIdState: atom({
      key: 'test-unavailable-thread',
      default: undefined
    }),
    threadHistoryState: atom({ key: 'test-history', default: {} }),
    useConfig: () => ({ config: { threadResumable: true } }),
    useChatMessages: () => ({ threadId: mockThreadId() })
  };
});
vi.mock('pages/Page', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
vi.mock('@/components/ReadOnlyThread', () => ({
  ReadOnlyThread: ({ id }: { id: string }) => <div>History {id}</div>
}));
vi.mock('@/components/AutoResumeThread', () => ({
  default: () => <div>Resume</div>
}));
vi.mock('@/components/Loader', () => ({ Loader: () => <div>Loading</div> }));
vi.mock('@/components/chat', () => ({ default: () => <div>Chat input</div> }));

function showThread(unavailableId?: string) {
  render(
    <RecoilRoot
      initializeState={({ set }) =>
        set(unavailableThreadIdState, unavailableId)
      }
    >
      <MemoryRouter initialEntries={['/thread/old']}>
        <Routes>
          <Route path="/thread/:id" element={<ThreadPage />} />
        </Routes>
      </MemoryRouter>
    </RecoilRoot>
  );
}

describe('ThreadPage unavailable profile fallback', () => {
  beforeEach(() => mockThreadId.mockReturnValue(undefined));

  it('shows private history without a loading loop or chat input', () => {
    showThread('old');
    expect(screen.getByText('History old')).toBeInTheDocument();
    expect(screen.queryByText('Resume')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    expect(screen.queryByText('Chat input')).not.toBeInTheDocument();
  });

  it('continues to resume other available threads', () => {
    showThread('another');
    expect(screen.getByText('Resume')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('keeps the normal resumed chat writable', () => {
    mockThreadId.mockReturnValue('old');
    showThread();
    expect(screen.getByText('Chat input')).toBeInTheDocument();
    expect(screen.queryByText('History old')).not.toBeInTheDocument();
  });
});
