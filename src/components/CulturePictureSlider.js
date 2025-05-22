import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronRight,
  faChevronLeft,
} from "@fortawesome/free-solid-svg-icons";

const slideImagesData = [
  {
    id: 1,
    src: "https://api2.cultureconnection.se/assets/climbing-pictures/1294348357560434719_1294348345917313044.jpg",
    alt: "Image 1",
  },
  {
    id: 2,
    src: "https://api2.cultureconnection.se/assets/climbing-pictures/1294101530726760518_1294101530303004692.jpg",
    alt: "Image 2",
  },
  {
    id: 3,
    src: "https://api2.cultureconnection.se/assets/pics-or-it-didnt-happen/1315615930641944627_1315615939672277072.jpg",
    alt: "Board game image",
  },
  {
    id: 4,
    src: "https://api2.cultureconnection.se/assets/crafts-pictures/1329877326598639678_1329877314674364548.jpg",
    alt: "Crafts example image",
  },
  {
    id: 5,
    src: "https://api2.cultureconnection.se/assets/pics-or-it-didnt-happen/1309498053673091072_1309498046865739796.jpg",
    alt: "Image 5",
  },
];

const cultureConnectionLogoUrl =
  "https://welcome.cultureconnection.se/assets/CCLogo-D0TRwCJL.png";

const imageVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.5, ease: "easeInOut" } },
  exit: { opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } },
};

function ArrowButton({ onClick, icon, ariaLabel, positionClasses }) {
  return (
    <button
      className={`
        !flex items-center justify-center
        absolute top-1/2 transform -translate-y-1/2 
        ${positionClasses}
        p-2
        hover:text-white/50
        z-20 
        text-white
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        transition-colors duration-150
      `}
      onClick={onClick}
      aria-label={ariaLabel}
      type="button"
    >
      <FontAwesomeIcon
        icon={icon}
        className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" // Slightly larger icon
      />
    </button>
  );
}

const CulturePictureSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const paginate = useCallback((newDirection) => {
    if (newDirection > 0) {
      setCurrentIndex(
        (prevIndex) => (prevIndex + 1) % slideImagesData.length,
      );
    } else {
      setCurrentIndex(
        (prevIndex) =>
          (prevIndex - 1 + slideImagesData.length) % slideImagesData.length,
      );
    }
  }, []);

  const goToSlide = useCallback((slideIndex) => {
    setCurrentIndex(slideIndex);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      paginate(1);
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentIndex, paginate]);

  const currentImage = slideImagesData[currentIndex];

  const numIndicators = slideImagesData.length;
  const startAngleDeg = 110;
  const endAngleDeg = 160;
  const angleStepDeg =
    numIndicators > 1
      ? (endAngleDeg - startAngleDeg) / (numIndicators - 1)
      : 0;
  const singleIndicatorAngleDeg = (startAngleDeg + endAngleDeg) / 2;
  const indicatorPathRadiusPercent = 48;

  return (
    <div className="relative flex flex-col w-full max-w-xl mx-auto px-4">
      <div className="mt-auto w-full">
        <div className="relative w-full aspect-square">
          <div className="absolute inset-0 rounded-full overflow-hidden z-[5] bg-gray-100">
            <AnimatePresence initial={false} mode="wait">
              <motion.img
                key={currentIndex}
                src={currentImage.src}
                alt={currentImage.alt}
                variants={imageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
          </div>

          <ArrowButton
            onClick={() => paginate(1)}
            icon={faChevronLeft}
            ariaLabel="Previous slide"
            positionClasses="left-[1%]"
          />
          <ArrowButton
            onClick={() => paginate(-1)}
            icon={faChevronRight}
            ariaLabel="Next slide"
            positionClasses="right-[1%]"
          />

          <div className="absolute inset-0 z-20 pointer-events-none">
            <ul className="relative w-full h-full m-0 p-0 list-none">
              {slideImagesData.map((_, index) => {
                const currentIndicatorAngleDeg =
                  numIndicators === 1
                    ? singleIndicatorAngleDeg
                    : startAngleDeg + index * angleStepDeg;
                const currentIndicatorAngleRad =
                  currentIndicatorAngleDeg * (Math.PI / 180);
                const xPosPercent =
                  50 +
                  indicatorPathRadiusPercent *
                    Math.cos(currentIndicatorAngleRad);
                const yPosPercent =
                  50 +
                  indicatorPathRadiusPercent *
                    Math.sin(currentIndicatorAngleRad);
                const isActive = index === currentIndex;
                const lineRotationDeg = currentIndicatorAngleDeg + 90;

                return (
                  <motion.li
                    key={`indicator-${index}`}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto p-1"
                    style={{
                      left: `${xPosPercent}%`,
                      top: `${yPosPercent}%`,
                    }}
                    onClick={() => goToSlide(index)}
                  >
                    <div
                      className={`
                        w-5 h-0.5 cursor-pointer transition-colors duration-200 rounded
                        ${isActive ? "bg-blue-500" : "bg-white/70 hover:bg-white/90"}`}
                      aria-label={`Go to slide ${index + 1}`}
                      style={{
                        transform: `rotate(${lineRotationDeg}deg)`,
                      }}
                    ></div>
                  </motion.li>
                );
              })}
            </ul>
          </div>

          <div className="absolute left-[-10%] z-10">
            <img
              src={cultureConnectionLogoUrl}
              alt="Culture Connection Logo"
              className="
                w-[35%] 
                aspect-square 
                rounded-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CulturePictureSlider;
