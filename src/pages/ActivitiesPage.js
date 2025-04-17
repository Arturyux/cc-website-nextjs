"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { env } from "@/env.mjs";

import ClimbingModal from '../components/ActivitiesModal/ClimbingModal';
import BoardGamesModal from '../components/ActivitiesModal/BoardGamesModal';
import FunSwedishModal from '../components/ActivitiesModal/FunSwedishModal';
import CraftsModal from '../components/ActivitiesModal/CraftsModal';
import DancingModal from '../components/ActivitiesModal/DancingModal';
import ActivitiesMobile from './mobile/ActivitiesMobile';

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

const CARD_HEIGHT_DESKTOP = 450;
const CARD_WIDTH_DESKTOP = 'max-w-3xl';
const CARD_PEEK_Y_DESKTOP = -30;
const CARD_PEEK_X_DESKTOP = 18;

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
        console.error("Error: NEXT_PUBLIC_FETCHPICTURE_URL is not defined in env.");
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
      x: index * CARD_PEEK_X_DESKTOP,
      y: index * CARD_PEEK_Y_DESKTOP,
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
      x: direction === 'right' ? -600 : 600,
      opacity: 0,
      scale: 0.9,
      y: 30,
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

  const stackContainerHeight = CARD_HEIGHT_DESKTOP + Math.abs(CARD_PEEK_Y_DESKTOP * 3) + 50;

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
    <div className="flex flex-col items-center min-h-screen py-8 md:py-12 overflow-x-hidden">
        <p className="font-Header text-mainColor md:text-9xl text-7xl sm:text-6xl font-bold">Weekly Activities</p>

      <div className="hidden md:flex flex-col items-center w-full max-w-6xl px-4">
        <div className="flex items-center justify-center w-full">
          <div
            className={`relative w-full ${CARD_WIDTH_DESKTOP} mx-auto`}
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
                      height: `${CARD_HEIGHT_DESKTOP}px`,
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
                      // Allow clicking the front card to rotate right (next)
                      if (index === 0) {
                        rotateRight();
                      }
                      // Optionally, allow clicking back cards to bring them to front:
                      // else if (index > 0 && index < 4) { // Only allow clicking visible stacked cards
                      //   // Logic to bring card at 'index' to the front
                      //   setCards(prevCards => {
                      //     const clickedCard = prevCards[index];
                      //     const rest = prevCards.filter((_, i) => i !== index);
                      //     return [clickedCard, ...rest];
                      //   });
                      // }
                    }}
                  >
                    <div
                      className={`card ${
                        card.bgColor || 'bg-gradient-to-br from-gray-100 to-gray-200'
                      } w-full h-full flex rounded-xl border-2 border-black shadow-black shadow-xl overflow-hidden`}
                    >
                      <div className="w-1/2 flex flex-col justify-between p-5 lg:p-6 text-left">
                        <div>
                          <h2 className="card-title text-black text-2xl lg:text-3xl font-bold mb-3">
                            {card.title}
                          </h2>
                          <p className="text-base lg:text-lg text-gray-700 font-medium mb-4 line-clamp-4">
                            {card.description}
                          </p>
                        </div>
                        <div>
                          <div className="text-sm lg:text-base font-semibold mb-4 space-y-1">
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
                            className="btn bg-blue-500 text-black text-center px-6 py-2.5 rounded border-2 border-black shadow-md shadow-black hover:shadow-none hover:bg-blue-400 transition-all text-base lg:text-lg font-semibold"
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
                            <span className="text-gray-600 text-4xl font-bold opacity-50">
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

        </div>
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
