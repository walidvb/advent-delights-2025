'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Participant } from './types';

interface AboutSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
}

export function AboutSidebar({
  isOpen,
  onClose,
  participants,
}: AboutSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white p-6 shadow-xl overflow-y-auto flex flex-col"
          >
            <button
              onClick={onClose}
              className="absolute cursor-pointer top-4 right-4 p-2 text-zinc-500 hover:text-zinc-900"
            >
              <CloseIcon className="h-6 w-6" />
            </button>

            <h2 className="text-2xl font-bold mb-4">Bemvindo!</h2>

            <p className="text-zinc-600 mb-6">
              Welcome to the Advent Delights musical calendar. Discover every
              day one track to sooth your mind and one to make you move your
              body. In the spirit of giving and receiving, we hope that all our
              friends may delight their following 25 days with the power of
              music.
            </p>

            <h3 className="text-lg font-semibold mb-3">Contributors</h3>

            <p className="text-zinc-600 leading-relaxed">
              A huge thanks to our old and new friends for their contributions,
              and for sharing their passion for music with us. <br />
              {participants.map((participant, index) => (
                <span key={participant.name}>
                  {index > 0 && ', '}
                  {participant.link ? (
                    <a
                      href={participant.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-700 hover:underline"
                    >
                      {participant.name}
                    </a>
                  ) : (
                    <span>{participant.name}</span>
                  )}
                </span>
              ))}
            </p>

            <div className="grow"></div>
            <p>
              Made in 2025, with <span className="text-teal-600">🩶</span> by
              Aline & Walid
            </p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
