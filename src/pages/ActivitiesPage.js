"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import GenericActivityModal from "../components/ActivitiesModal/GenericActivityModal";
import ActivitiesMobile from "./mobile/ActivitiesMobile";

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

const CARD_BASE_HEIGHT = 450;
const CARD_WIDTH_DESKTOP = "max-w-3xl";
const ANIMATION_DURATION_MS = 400;
const NUM_VISIBLE_STACK_CARDS_DESKTOP = 2;

const fetchCardsData = async () => {
  const response = await fetch("/api/cards");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch cards: ${response.statusText}`,
    );
  }
  const data = await response.json();
  return data.map((card) => ({
    ...card,
    description:
      card.description ||
      `Learn more about our exciting ${card.title} activity! More details inside.`,
    inDescription: Array.isArray(card.inDescription)
      ? card.inDescription.map((item) => ({
          ...item,
          ImagesUrl: Array.isArray(item.ImagesUrl) ? item.ImagesUrl : [],
        }))
      : [],
  }));
};

export default function ActivitiesPage() {
  const [allCards, setAllCards] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState("next");
  const [error, setError] = useState(null);
  const [activeModalCard, setActiveModalCard] = useState(null);

  const {
    data: cardsData = [],
    isLoading: isLoadingCards,
    isError: isCardsError,
    error: cardsFetchError,
    isSuccess: isCardsSuccess,
  } = useQuery({
    queryKey: ["activityCards"],
    queryFn: fetchCardsData,
  });

  useEffect(() => {
    if (isCardsSuccess && cardsData) {
      setAllCards(cardsData);
      setActiveIndex(0);
      setError(null);
    } else if (isCardsError) {
      setError(cardsFetchError?.message || "Failed to load card data.");
    }
  }, [isCardsSuccess, cardsData, isCardsError, cardsFetchError]);

  const rotateStack = (newDirection) => {
    if (allCards.length < 2 || isAnimating) return;
    setIsAnimating(true);
    setDirection(newDirection);

    if (newDirection === "next") {
      setActiveIndex((prevIndex) => (prevIndex + 1) % allCards.length);
    } else {
      setActiveIndex(
        (prevIndex) => (prevIndex - 1 + allCards.length) % allCards.length,
      );
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, ANIMATION_DURATION_MS);
  };

  const openModal = (cardData) => {
    setActiveModalCard(cardData);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setActiveModalCard(null);
    document.body.style.overflow = "";
  };

  const desktopCardVariants = {
    enter: (customDirection) => ({
      x: customDirection === "next" ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      rotate: customDirection === "next" ? -10 : 10,
    }),
    center: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: 1,
      zIndex: NUM_VISIBLE_STACK_CARDS_DESKTOP + 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
        duration: ANIMATION_DURATION_MS / 1000,
      },
    },
    exit: (customDirection) => ({
      x: customDirection === "next" ? -300 : 300,
      opacity: 0,
      scale: 0.9,
      rotate: customDirection === "next" ? 10 : -10,
      zIndex: NUM_VISIBLE_STACK_CARDS_DESKTOP + 2,
      transition: { duration: ANIMATION_DURATION_MS / 1000, ease: "easeIn" },
    }),
    stackItem: (i) => ({
      x: 0,
      y: (i + 1) * 25,
      scale: 1 - (i + 1) * 0.05,
      opacity: i < NUM_VISIBLE_STACK_CARDS_DESKTOP ? 1 - (i + 1) * 0.3 : 0,
      zIndex: NUM_VISIBLE_STACK_CARDS_DESKTOP - i,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    }),
  };
  const desktopStackContainerHeight =
    CARD_BASE_HEIGHT + 25 * NUM_VISIBLE_STACK_CARDS_DESKTOP + 50;

  if (isLoadingCards && allCards.length === 0) {
    return <div className="text-center py-10">Loading activities...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-600">Error: {error}</div>;
  }
  if (allCards.length === 0 && !isLoadingCards) {
    return <div className="text-center py-10">No activities found.</div>;
  }

  const currentActiveCardData =
    allCards.length > 0 ? allCards[activeIndex] : null;

  return (
    <div className="flex flex-col items-center min-h-screen py-8 md:py-12 overflow-x-hidden">
      <p className="font-Header text-mainColor md:text-9xl text-7xl sm:text-6xl font-bold mb-8">
        Weekly Activities
      </p>

      <div className="hidden md:flex flex-col items-center w-full max-w-6xl px-4">
        <div
          className={`relative w-full ${CARD_WIDTH_DESKTOP} mx-auto`}
          style={{ height: `${desktopStackContainerHeight}px` }}
        >
          {allCards.map((card, indexInAllCards) => {
            if (indexInAllCards === activeIndex) return null;

            let visualDepth = -1;
            let tempIdx = activeIndex;
            for (let i = 0; i < NUM_VISIBLE_STACK_CARDS_DESKTOP; i++) {
              tempIdx = (tempIdx + 1) % allCards.length;
              if (tempIdx === indexInAllCards) {
                visualDepth = i;
                break;
              }
            }

            if (visualDepth === -1) return null;

            return (
              <motion.div
                key={card.id + "-stack"}
                className="absolute w-full origin-bottom"
                style={{
                  height: `${CARD_BASE_HEIGHT}px`,
                  left: "0",
                  right: "0",
                  top: "0",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
                variants={desktopCardVariants}
                animate={desktopCardVariants.stackItem(visualDepth)}
                initial={false}
              >
                <CardContent card={card} isStack={true} />
              </motion.div>
            );
          })}

          <AnimatePresence initial={false} custom={direction}>
            {currentActiveCardData && (
              <motion.div
                key={currentActiveCardData.id}
                className="absolute w-full cursor-pointer origin-bottom"
                style={{
                  height: `${CARD_BASE_HEIGHT}px`,
                  left: "0",
                  right: "0",
                  top: "0",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
                custom={direction}
                variants={desktopCardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onClick={() => !isAnimating && rotateStack("next")}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.5}
                onDragEnd={(event, { offset, velocity }) => {
                  if (isAnimating) return;
                  const swipeThreshold = 100;
                  if (offset.x < -swipeThreshold) {
                    rotateStack("next");
                  } else if (offset.x > swipeThreshold) {
                    rotateStack("prev");
                  }
                }}
              >
                <CardContent
                  card={currentActiveCardData}
                  isStack={false}
                  openModal={openModal}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center space-x-5 justify-center w-full mt-0">
          <Link
            href="/events"
            className="px-8 py-3 text-white bg-baseColor rounded-full font-Header text-3xl"
          >
            <p>Events</p>
          </Link>
          <motion.button
            onClick={() => !isAnimating && rotateStack("prev")}
            className="px-8 py-3 text-white bg-gray-500 rounded-full font-Header text-3xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isAnimating || allCards.length < 2}
          >
            Prev
          </motion.button>
          <motion.button
            onClick={() => !isAnimating && rotateStack("next")}
            className="px-8 py-3 text-white bg-baseColor rounded-full font-Header text-3xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isAnimating || allCards.length < 2}
          >
            Next
          </motion.button>
        </div>
      </div>

      <div className="md:hidden w-full flex-grow flex flex-col">
        <ActivitiesMobile
          activeCardData={currentActiveCardData}
          onRotate={rotateStack}
          openModal={openModal}
          isAnimating={isAnimating}
          cardCount={allCards.length}
        />
      </div>

      <AnimatePresence>
        {activeModalCard && (
          <GenericActivityModal
            isOpen={!!activeModalCard}
            onClose={closeModal}
            cardData={activeModalCard}
            motionVariants={modalVariants}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CardContent({ card, isStack, openModal }) {
  const imageSrc = card.imageUrl;
  return (
    <div
      className={`card ${
        card.bgColor || "bg-gradient-to-br from-gray-100 to-gray-200"
      } w-full h-full flex ${
        isStack ? "flex-col opacity-80" : "md:flex-row"
      } rounded-xl border-2 border-black shadow-black shadow-xl overflow-hidden`}
    >
      <div
        className={`relative ${
          isStack ? "w-full h-2/5" : "md:w-1/2 w-full h-full md:h-full"
        } bg-gray-300 flex-shrink-0`}
      >
        {imageSrc ? (
          <motion.img
            key={imageSrc + (isStack ? "-stack" : "-active")}
            src={imageSrc}
            alt={card.title}
            className="object-cover w-full h-full"
            initial={{ opacity: isStack ? 0.5 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
            <span className="text-gray-600 text-3xl md:text-4xl font-bold opacity-50">
              {card.title.substring(0, 3)}
            </span>
          </div>
        )}
      </div>
      <div
        className={`flex flex-col justify-between p-3 md:p-4 lg:p-5 text-left ${
          isStack ? "w-full h-3/5" : "md:w-1/2 w-full"
        } overflow-y-auto`}
      >
        <div>
          <h2
            className={`card-title text-black ${
              isStack ? "text-md md:text-lg" : "text-xl md:text-2xl lg:text-3xl"
            } font-bold mb-1 md:mb-2 truncate`}
          >
            {card.title}
          </h2>
          {!isStack && (
            <p className="text-sm md:text-base lg:text-lg text-gray-700 font-medium mb-2 md:mb-3 line-clamp-3 md:line-clamp-4">
              {card.description}
            </p>
          )}
        </div>
        <div className="mt-auto">
          <div
            className={`text-xs ${
              isStack ? "" : "md:text-sm"
            } font-semibold mb-2 md:mb-3 space-y-0.5 md:space-y-1`}
          >
            <p className="text-gray-800">
              <span className="font-bold">Date:</span> {card.date}
            </p>
            <p className="text-gray-800">
              <span className="font-bold">Time:</span> {card.time}
            </p>
            <p className="text-gray-800">
              <span className="font-bold">Location:</span> {card.location}
            </p>
          </div>
          {!isStack && openModal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openModal(card);
              }}
              className="w-full md:w-auto mt-1 md:mt-2 text-center px-4 md:px-6 py-2 md:py-2.5 rounded-lg border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-baseColor text-white font-semibold text-sm md:text-base"
            >
              More Info
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
