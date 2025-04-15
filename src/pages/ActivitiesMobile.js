import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

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
  climbingImages = [],
  funSwedishImages = [],
  boardGamesImages = [],
  dancingImages = [],
  craftsImages = [],
  rotateLeft,
  rotateRight,
  openModal,
  lastDirection,
}) {
  const stackContainerHeight = CARD_HEIGHT_MOBILE + CARD_PEEK_MOBILE * 3 + 20;

  // Helper function to get the correct image source
  const getImageSrc = (title) => {
    switch (title) {
      case 'Climbing':
        return climbingImages[0]?.url;
      case 'Fun Swedish':
        return funSwedishImages[0]?.url;
      case 'Board Games':
        return boardGamesImages[0]?.url;
      case 'Dancing':
        return dancingImages[0]?.url;
      case 'Crafts':
        return craftsImages[0]?.url;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto py-4">
      <motion.button
        onClick={rotateLeft}
        className="z-20 mb-4 p-3 rounded-full bg-blue-400 text-white border-2 border-blue-600 shadow-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        disabled={cards.length < 2}
        aria-label="Previous Activity"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </motion.button>

      <div
        className="relative w-full mx-auto mb-4"
        style={{ height: `${stackContainerHeight}px` }}
      >
        {cards.map((card, index) => {
          // Get the image source for the current card
          const imageSrc = getImageSrc(card.title);
          return (
            <motion.div
              key={card.id}
              layout
              className="absolute w-full cursor-pointer origin-center"
              style={{
                height: `${CARD_HEIGHT_MOBILE}px`,
                left: '0',
                right: '0',
                top: '0',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
              custom={index === 0 ? lastDirection : index}
              variants={mobileCardVariants}
              initial="stack"
              animate={index === 0 ? 'center' : 'stack'}
              exit="exit"
              onClick={() => {
                if (index === 0) {
                  rotateRight();
                }
              }}
            >
              <div
                className={`card ${
                  card.bgColor || 'bg-gradient-to-br from-gray-100 to-gray-200'
                } w-full h-full flex flex-col rounded-xl border-2 border-black shadow-black shadow-lg overflow-hidden`}
              >
                <div className="w-full h-1/2 bg-gray-300 relative flex-shrink-0">
                  {/* Use the imageSrc variable */}
                  {imageSrc ? (
                    <motion.img
                      key={imageSrc}
                      src={imageSrc}
                      alt={card.title}
                      className="object-cover w-full h-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                      <span className="text-gray-600 text-2xl font-bold opacity-50">
                        {card.title.substring(0, 3)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="w-full flex-grow flex flex-col justify-between p-4 text-left overflow-y-auto">
                  <div>
                    <h2 className="card-title text-black text-xl font-bold mb-1">
                      {card.title}
                    </h2>
                    <div className="text-xs font-semibold mb-2 space-y-0.5">
                      <p className="text-gray-800">
                        <span className="font-bold">Date:</span> {card.date}
                      </p>
                      <p className="text-gray-800">
                        <span className="font-bold">Time:</span> {card.time}
                      </p>
                      <p className="text-gray-800">
                        <span className="font-bold">Location:</span>{' '}
                        {card.location}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto pt-2 flex justify-center">
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(card.title);
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
      <motion.button
        onClick={rotateRight}
        className="z-20 mt-4 p-3 rounded-full bg-blue-400 text-white border-2 border-blue-600 shadow-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        disabled={cards.length < 2}
        aria-label="Next Activity"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </motion.button>
    </div>
  );
}

ActivitiesMobile.propTypes = {
  cards: PropTypes.array.isRequired,
  climbingImages: PropTypes.array,
  funSwedishImages: PropTypes.array,
  boardGamesImages: PropTypes.array, 
  dancingImages: PropTypes.array,    
  craftsImages: PropTypes.array,     
  rotateLeft: PropTypes.func.isRequired,
  rotateRight: PropTypes.func.isRequired,
  openModal: PropTypes.func.isRequired,
  lastDirection: PropTypes.string,
};
