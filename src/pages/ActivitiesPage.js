"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { env } from "@/env.mjs";

import ClimbingModal from '../components/ActivitiesModal/ClimbingModal';
import BoardGamesModal from '../components/ActivitiesModal/BoardGamesModal';
import FunSwedishModal from '../components/ActivitiesModal/FunSwedishModal';
import CraftsModal from '../components/ActivitiesModal/CraftsModal';
import DancingModal from '../components/ActivitiesModal/DancingModal';
import ActivitiesMobile from './ActivitiesMobile';

const modalVariants = {
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

export default function ActivitiesPage() {
  const [cards, setCards] = useState([]);
  const [climbingImages, setClimbingImages] = useState([]);
  const [funSwedishImages, setFunSwedishImages] = useState([]);
  const [boardGamesImages, setBoardGamesImages] = useState([]);
  const [dancingImages, setDancingImages] = useState([]);
  const [craftsImages, setCraftsImages] = useState([]);
  const [error, setError] = useState(null);
  const [lastDirection, setLastDirection] = useState(null);

  const [isClimbingModalOpen, setIsClimbingModalOpen] = useState(false);
  const [isBoardGamesModalOpen, setIsBoardGamesModalOpen] = useState(false);
  const [isFunSwedishModalOpen, setIsFunSwedishModalOpen] = useState(false);
  const [isCraftsModalOpen, setIsCraftsModalOpen] = useState(false);
  const [isDancingModalOpen, setIsDancingModalOpen] = useState(false);

  const shuffleArray = (array) => {
    if (!Array.isArray(array)) return [];
    let currentIndex = array.length,
      randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
    return array;
  };

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await fetch('/api/cards');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const cardsWithDesc = data.map((card) => ({
          ...card,
          description:
            card.description ||
            `Learn more about our exciting ${card.title} activity! More details inside.`,
        }));
        setCards(cardsWithDesc);
      } catch (error) {
        console.error('Error fetching cards:', error);
        setError('Failed to load card data.');
      }
    };
    fetchCards();
  }, []);

  const fetchPicture = env.NEXT_PUBLIC_FETCHPICTURE_URL;

  useEffect(() => {
    const fetchImages = async () => {
      if (!fetchPicture) {
        setError("Picture fetch URL is not configured.");
        return;
      }
      try {
        const results = await Promise.allSettled([
          fetch(`${fetchPicture}/assets/climbing-pictures`),
          fetch(`${fetchPicture}/assets/swedish-fun-pictures`),
          fetch(`${fetchPicture}/assets/board-games-pictures`),
          fetch(`${fetchPicture}/assets/dancing-pictures`),
          fetch(`${fetchPicture}/assets/crafts-pictures`)
        ]);

        const [
          climbingRes,
          funSwedishRes,
          boardgamesRes,
          dancingRes,
          craftsRes
        ] = results;

        let fetchErrors = [];

        const processResponse = async (responsePromise, name) => {
          if (responsePromise.status === 'fulfilled') {
            const response = responsePromise.value;
            if (!response.ok) {
              fetchErrors.push(`${name} images error: ${response.status}`);
              return [];
            }
            try {
              const data = await response.json();
              return Array.isArray(data) ? shuffleArray([...data]) : [];
            } catch (jsonError) {
              fetchErrors.push(`Error parsing ${name} JSON: ${jsonError.message}`);
              return [];
            }
          } else {
            fetchErrors.push(`Failed to fetch ${name} images: ${responsePromise.reason}`);
            return [];
          }
        };

        setClimbingImages(await processResponse(climbingRes, 'Climbing'));
        setFunSwedishImages(await processResponse(funSwedishRes, 'Fun Swedish'));
        setBoardGamesImages(await processResponse(boardgamesRes, 'Board Games'));
        setDancingImages(await processResponse(dancingRes, 'Dancing'));
        setCraftsImages(await processResponse(craftsRes, 'Crafts'));

        if (fetchErrors.length > 0) {
          console.error('Errors fetching images:', fetchErrors);
          setError(
            (prevError) =>
              `${prevError ? prevError + ' ' : ''}Failed to load some images. ${fetchErrors.join('. ')}`
          );
        }

      } catch (error) {
        console.error('General error fetching images:', error);
        setError(
          (prevError) =>
            `${prevError ? prevError + ' ' : ''}Failed to load images.`
        );
      }
    };
    fetchImages();
  }, [fetchPicture]);

  const cardVariants = {
    stack: (index) => ({
      opacity: index < 4 ? 1 - index * 0.15 : 0,
      scale: 1 - index * 0.04,
      x: index * 15,
      y: index * -25,
      zIndex: cards.length - index,
      transition: { type: 'spring', stiffness: 100, damping: 20 },
    }),
    center: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      zIndex: cards.length + 1,
      transition: { type: 'spring', stiffness: 100, damping: 20 },
    },
    exit: (direction) => ({
      x: direction === 'right' ? -500 : 500,
      opacity: 0,
      scale: 0.9,
      y: 20,
      zIndex: 0,
      transition: { duration: 0.4, ease: 'easeInOut' },
    }),
  };

  const rotateLeft = () => {
    if (cards.length < 2) return;
    setLastDirection('left');
    setCards((prevCards) => {
      const lastCard = prevCards[prevCards.length - 1];
      return [lastCard, ...prevCards.slice(0, prevCards.length - 1)];
    });
  };

  const rotateRight = () => {
    if (cards.length < 2) return;
    setLastDirection('right');
    setCards((prevCards) => {
      const [firstCard, ...rest] = prevCards;
      return [...rest, firstCard];
    });
  };

  const openModal = (title) => {
    if (title === 'Climbing') setIsClimbingModalOpen(true);
    else if (title === 'Board Games') setIsBoardGamesModalOpen(true);
    else if (title === 'Fun Swedish') setIsFunSwedishModalOpen(true);
    else if (title === 'Crafts') setIsCraftsModalOpen(true);
    else if (title === 'Dancing') setIsDancingModalOpen(true);
  };

  const cardHeight = 380;
  const stackContainerHeight = cardHeight + 100;

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
    <div className="flex flex-col items-center min-h-screen py-8 overflow-x-hidden">
      {error && (
        <p className="text-red-500 mb-4 px-4 text-center">{error}</p>
      )}

      <div className="hidden md:flex flex-col items-center w-full max-w-5xl px-4">
        <div className="flex items-center justify-center w-full gap-4 sm:gap-6">
           <motion.button
            onClick={rotateLeft}
            className="flex-shrink-0 z-20 p-3 rounded-full bg-blue-400 text-white border-2 border-blue-600 shadow-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={cards.length < 2}
            aria-label="Previous Activity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 sm:h-8 sm:w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>
          <div
            className="relative w-full max-w-2xl mx-auto"
            style={{ height: `${stackContainerHeight}px` }}
          >
            <AnimatePresence initial={false} custom={lastDirection}>
              {cards.map((card, index) => {
                const imageSrc = getImageSrc(card.title);
                return (
                  <motion.div
                    key={card.id}
                    className="absolute w-full cursor-pointer origin-bottom"
                    style={{
                      height: `${cardHeight}px`,
                      left: '0',
                      right: '0',
                      top: '50px',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}
                    custom={index === 0 ? lastDirection : index}
                    variants={cardVariants}
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
                      } w-full h-full flex rounded-xl border-2 border-black shadow-black shadow-lg overflow-hidden`}
                    >
                      <div className="w-1/2 flex flex-col justify-between p-4 sm:p-5 text-left">
                        <div>
                          <h2 className="card-title text-black text-xl sm:text-2xl font-bold mb-2">
                            {card.title}
                          </h2>
                          <p className="text-sm sm:text-base text-gray-700 font-medium mb-3 line-clamp-4">
                            {card.description}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold mb-3 space-y-1">
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
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(card.title);
                            }}
                            className="btn bg-blue-500 text-black text-center px-5 py-2 rounded border-2 border-black shadow-md shadow-black hover:shadow-none hover:bg-blue-400 transition-all text-sm sm:text-base font-semibold"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            More Info
                          </motion.button>
                        </div>
                      </div>
                      <div className="w-1/2 h-full bg-gray-300 relative">
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
                            <span className="text-gray-600 text-3xl font-bold opacity-50">
                              {card.title.substring(0, 3)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
           <motion.button
            onClick={rotateRight}
            className="flex-shrink-0 z-20 p-3 rounded-full bg-blue-400 text-white border-2 border-blue-600 shadow-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={cards.length < 2}
            aria-label="Next Activity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 sm:h-8 sm:w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.button>
        </div>
      </div>

      <div className="md:hidden flex items-center justify-center px-4 py-4 w-full">
        <ActivitiesMobile
          cards={cards}
          climbingImages={climbingImages}
          funSwedishImages={funSwedishImages}
          boardGamesImages={boardGamesImages}
          dancingImages={dancingImages}
          craftsImages={craftsImages}
          rotateLeft={rotateLeft}
          rotateRight={rotateRight}
          openModal={openModal}
          lastDirection={lastDirection}
        />
      </div>

      <AnimatePresence>
        {isClimbingModalOpen && (
          <ClimbingModal
            isOpen={isClimbingModalOpen}
            onClose={() => setIsClimbingModalOpen(false)}
            motionVariants={modalVariants}
          />
        )}
        {isBoardGamesModalOpen && (
          <BoardGamesModal
            isOpen={isBoardGamesModalOpen}
            onClose={() => setIsBoardGamesModalOpen(false)}
            motionVariants={modalVariants}
          />
        )}
        {isFunSwedishModalOpen && (
          <FunSwedishModal
            isOpen={isFunSwedishModalOpen}
            onClose={() => setIsFunSwedishModalOpen(false)}
            motionVariants={modalVariants}
          />
        )}
        {isCraftsModalOpen && (
          <CraftsModal
            isOpen={isCraftsModalOpen}
            onClose={() => setIsCraftsModalOpen(false)}
            motionVariants={modalVariants}
          />
        )}
        {isDancingModalOpen && (
          <DancingModal
            isOpen={isDancingModalOpen}
            onClose={() => setIsDancingModalOpen(false)}
            motionVariants={modalVariants}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
