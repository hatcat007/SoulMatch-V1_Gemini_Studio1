import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, Image as ImageIcon } from 'lucide-react';
import { fetchPrivateFile } from '../services/s3Service';
import type { ImageRecord } from '../types';

const PrivateSlideImage: React.FC<{src: string, alt: string}> = ({ src, alt }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        let isMounted = true;
        if (src) {
            setLoading(true);
            fetchPrivateFile(src).then(url => {
                if (isMounted) {
                    objectUrl = url;
                    setImageUrl(url);
                    setLoading(false);
                }
            });
        } else {
             if (isMounted) setLoading(false);
        }

        return () => {
            isMounted = false;
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);
    
    if (loading) {
        return <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light"><Loader2 className="animate-spin text-gray-400" size={32}/></div>;
    }
    if (!imageUrl) {
         return <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-surface-light"><ImageIcon className="text-gray-400" size={32}/></div>;
    }

    return <img src={imageUrl} alt={alt} className="w-full h-full object-cover" />;
};

// FIX: Define a constant for the motion component to help TypeScript resolve types.
const MotionDiv = motion.div;

const ImageSlideshow: React.FC<{ images?: ImageRecord[], alt: string }> = ({ images, alt }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const validImages = images?.filter(img => img && img.image_url) || [];

    useEffect(() => {
        if (validImages.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex(prevIndex => (prevIndex + 1) % validImages.length);
        }, 5000); // Change image every 5 seconds

        return () => clearInterval(interval);
    }, [validImages.length]);

    if (validImages.length === 0) {
        return (
            <div className="w-full aspect-square rounded-2xl bg-gray-100 dark:bg-dark-surface-light flex items-center justify-center text-gray-400">
                <ImageIcon size={48} />
            </div>
        );
    }
    
    if (validImages.length === 1) {
         return (
            <div className="w-full aspect-square rounded-2xl overflow-hidden">
                <PrivateSlideImage src={validImages[0].image_url} alt={alt} />
            </div>
        );
    }

    const prevSlide = () => setCurrentIndex(i => (i === 0 ? validImages.length - 1 : i - 1));
    const nextSlide = () => setCurrentIndex(i => (i + 1) % validImages.length);
    const goToSlide = (slideIndex: number) => setCurrentIndex(slideIndex);

    return (
        <div className="w-full aspect-square relative group rounded-2xl overflow-hidden bg-gray-200 dark:bg-dark-surface-light">
            <AnimatePresence initial={false}>
                <MotionDiv
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                >
                    <PrivateSlideImage src={validImages[currentIndex].image_url} alt={`${alt} ${currentIndex + 1}`} />
                </MotionDiv>
            </AnimatePresence>
            
            <button onClick={prevSlide} className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/30 text-white p-2 rounded-full group-hover:opacity-100 opacity-0 transition-opacity z-10"><ChevronLeft size={24}/></button>
            <button onClick={nextSlide} className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/30 text-white p-2 rounded-full group-hover:opacity-100 opacity-0 transition-opacity z-10"><ChevronRight size={24}/></button>
            
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
                {validImages.map((_, slideIndex) => (
                    <button key={slideIndex} onClick={() => goToSlide(slideIndex)} className={`w-2 h-2 rounded-full transition-colors ${currentIndex === slideIndex ? 'bg-white' : 'bg-white/50'}`}></button>
                ))}
            </div>
        </div>
    );
};

export default ImageSlideshow;
