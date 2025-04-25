import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import Link from 'next/link';

const CARD_HEIGHT_MOBILE = 420;
const CARD_PEEK_MOBILE = 30;
const mobileCardVariants = {
  stack: (index) => ({
    opacity: index < 4 ? 1 - index * 0.2 : 0,
    scale: 1 - index * 0.04,
    y: index * CARD_PEEK_MOBILE,
    zIndex: -index,
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  }),
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
    zIndex: 1,
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  },
  exit: (direction) => ({
    y: direction === 'left' ? -400 : 400,
    opacity: 0,
    scale: 0.9,
    zIndex: 0,
    transition: { duration: 0.4, ease: 'easeInOut' },
  }),
};

export default function ActivitiesMobile({
  cards = [],
  rotateLeft,
  rotateRight,
  openModal,
  lastDirection,
}) {
  const stackContainerHeight = CARD_HEIGHT_MOBILE + CARD_PEEK_MOBILE * 3 + 20;

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto py-4">
      <div className="relative w-full mx-auto" style={{ height: `${stackContainerHeight}px` }}>
        {cards.map((card, index) => {
          const imageSrc = card.imageUrl;
          return (
            <motion.div
              key={card.id}
              layout
              className="absolute w-full cursor-pointer origin-center"
              style={{ height: `${CARD_HEIGHT_MOBILE}px`, left: '0', right: '0', top: '0', marginLeft: 'auto', marginRight: 'auto' }}
              custom={index === 0 ? lastDirection : index}
              variants={mobileCardVariants}
              initial="stack"
              animate={index === 0 ? 'center' : 'stack'}
              exit="exit"
              onClick={() => { if (index === 0) rotateRight(); }}
            >
              <div className={`card ${card.bgColor || 'bg-gradient-to-br from-gray-100 to-gray-200'} w-full h-full flex flex-col rounded-xl border-2 border-black shadow-black shadow-lg overflow-hidden`}>
                <div className="w-full h-1/2 bg-gray-300 relative flex-shrink-0">
                  {imageSrc ? (
                    <motion.img key={imageSrc} src={imageSrc} alt={card.title} className="object-cover w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400"><span className="text-gray-600 text-2xl font-bold opacity-50">{card.title.substring(0, 3)}</span></div>
                  )}
                </div>
                <div className="w-full flex-grow flex flex-col justify-between p-4 text-left overflow-y-auto">
                  <div>
                    <h2 className="card-title text-black text-xl font-bold mb-1">{card.title}</h2>
                    <div className="text-xs font-semibold mb-2 space-y-0.5">
                      <p className="text-gray-800"><span className="font-bold">Date:</span> {card.date}</p>
                      <p className="text-gray-800"><span className="font-bold">Time:</span> {card.time}</p>
                      <p className="text-gray-800"><span className="font-bold">Location:</span> {card.location}</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-2 flex justify-center">
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(card.id ?? card.title);
                      }}
                      className="btn bg-blue-500 text-black text-center px-5 py-2 rounded border-2 border-black shadow-md shadow-black hover:shadow-none hover:bg-blue-400 transition-all text-sm font-semibold"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      More Info
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center space-x-2 justify-center w-full">
          <Link href="/events" className="relative px-10 p-4 text-white bg-baseColor rounded-full font-Header text-4xl hover:scale-110"> <p>Events</p> </Link>
          <motion.button
            onClick={rotateRight}
            className="relative px-10 p-4 text-white bg-baseColor rounded-full font-Header text-4xl"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={cards.length < 2}
            aria-label="Next Activity"
          >
            <p>Next Card</p>
          </motion.button>
       </div>
    </div>
  );
}

ActivitiesMobile.propTypes = {
  cards: PropTypes.array.isRequired,
  rotateLeft: PropTypes.func.isRequired,
  rotateRight: PropTypes.func.isRequired,
  openModal: PropTypes.func.isRequired,
  lastDirection: PropTypes.string,
};
