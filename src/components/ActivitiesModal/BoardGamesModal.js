import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { env } from "@/env.mjs";

const defaultModalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

const imageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    transition: { duration: 0.4, ease: 'easeInOut' },
  }),
};

function BoardGamesModal({
  isOpen,
  onClose,
  motionVariants = defaultModalVariants,
}) {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);


  const fetchPicture = env.NEXT_PUBLIC_FETCHPICTURE_URL;

  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      setDirection(0);
      setImages([]);
      setError(null);
      return;
    }

    setError(null);
    // Corrected fetch URL
    fetch(`${fetchPicture}/assets/boardgame-pictures`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const shuffledImages = shuffleArray(data);
          setImages(shuffledImages);
        } else {
          console.error('Fetched data is not an array:', data);
          throw new Error('Invalid image data format.');
        }
      })
      .catch((error) => {
        console.error('Error fetching images:', error);
        setError('Failed to load images. Please try again later.');
      });
  }, [isOpen]);

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const totalSlides = images.length;

  const goToPrevSlide = (e) => {
    e.stopPropagation();
    if (totalSlides <= 1) return;
    setDirection(-1);
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? totalSlides - 1 : prevIndex - 1
    );
  };

  const goToNextSlide = (e) => {
    e.stopPropagation();
    if (totalSlides <= 1) return;
    setDirection(1);
    setCurrentIndex((prevIndex) =>
      prevIndex === totalSlides - 1 ? 0 : prevIndex + 1
    );
  };

  useEffect(() => {
    if (images.length > 1) {
      const nextIndex = (currentIndex + 1) % images.length;
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      if (images[nextIndex]?.url) {
        const nextImg = new Image();
        nextImg.src = images[nextIndex].url;
      }
      if (images[prevIndex]?.url) {
        const prevImg = new Image();
        prevImg.src = images[prevIndex].url;
      }
    }
  }, [currentIndex, images]);

  return (
    <motion.div
      className="fixed inset-0 bg-[rgba(0,0,0,0.4)] flex justify-center items-center z-50 p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        variants={motionVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {error && (
          <div className="p-4 bg-red-100 text-red-700">{error}</div>
        )}

        <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-200 overflow-hidden flex-shrink-0">
          <AnimatePresence initial={false} custom={direction}>
            {images.length > 0 ? (
              <motion.img
                key={currentIndex}
                src={images[currentIndex]?.url}
                alt={`Board Games image ${currentIndex + 1}`}
                custom={direction}
                variants={imageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                loading="eager"
                className={`absolute top-0 left-0 w-full h-full object-contain rounded-t-lg`}
              />
            ) : (
              !error && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  Loading images...
                </div>
              )
            )}
          </AnimatePresence>

          {totalSlides > 1 && (
            <>
              <button
                onClick={goToPrevSlide}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 btn btn-circle btn-sm sm:btn-md bg-black opacity-40 hover:bg-opacity-60 text-white border-none"
                aria-label="Previous image"
              >
                ❮
              </button>
              <button
                onClick={goToNextSlide}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 btn btn-circle btn-sm sm:btn-md bg-black opacity-40 hover:bg-opacity-60 text-white border-none"
                aria-label="Next image"
              >
                ❯
              </button>
            </>
          )}
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-grow">
          <h3 className="font-bold text-xl sm:text-2xl mb-4 text-gray-800">
            Board Game Night
          </h3>
          <div className="space-y-2 text-gray-700">
            <p>
              Board Game Night is happening every <strong>Tuesday at 18:00</strong>! Come and
              enjoy a fun evening; entry is free as always! We’ll be meeting in{' '}
              <strong>Building F</strong>.
            </p>
            <p>
              We have an exciting selection of games, sponsored by the{' '}
              <strong>Nexus Game Store</strong> in town and <strong>Sensus</strong>.
            </p>
            <p>
              Feel free to bring your own games to share with others!
            </p>
            <p>
              Whether you’re a beginner or a veteran gamer, everyone is welcome. We look
              forward to seeing you there!
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-100 border-t border-gray-200 flex justify-center flex-shrink-0">
          <motion.button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-2 text-center text-lg font-semibold rounded border-2 bg-gray-600 text-white border-gray-700 shadow-sm hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Close
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default BoardGamesModal;
