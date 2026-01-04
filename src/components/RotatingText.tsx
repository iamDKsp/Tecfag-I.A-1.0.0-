import { useState, useEffect } from "react";

const phrases = [
    "APRENDA, ENQUANTO VENDE!",
    "VENDA, ENQUANTO APRENDE!"
];

const RotatingText = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayPhrase, setDisplayPhrase] = useState(phrases[0]);
    const [animationKey, setAnimationKey] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationKey((prev) => prev + 1);
            setCurrentIndex((prev) => {
                const nextIndex = (prev + 1) % phrases.length;
                setDisplayPhrase(phrases[nextIndex]);
                return nextIndex;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <span className="inline-flex overflow-hidden" key={animationKey}>
            {displayPhrase.split("").map((char, index) => (
                <span
                    key={index}
                    className="inline-block animate-slot-enter"
                    style={{
                        animationDelay: `${index * 25}ms`,
                    }}
                >
                    {char === " " ? "\u00A0" : char}
                </span>
            ))}
        </span>
    );
};

export default RotatingText;
