"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Book, Star } from "lucide-react";

const BOOKS = [
  {
    id: 1,
    title: "Leo Goes to Mars",
    cover: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=1000&auto=format&fit=crop",
    color: "bg-indigo-900",
    starring: "Leo (Age 5)",
    style: "Pixar 3D"
  },
  {
    id: 2,
    title: "The Princess of Baker Street",
    cover: "https://images.unsplash.com/photo-1535581652167-3d6b9da6df36?q=80&w=1000&auto=format&fit=crop",
    color: "bg-pink-900",
    starring: "Maya (Age 7)",
    style: "Watercolor"
  },
  {
    id: 3,
    title: "Max & The Dinosaur",
    cover: "https://images.unsplash.com/photo-1569234817121-a25527c1c84d?q=80&w=1000&auto=format&fit=crop",
    color: "bg-green-900",
    starring: "Max (Age 4)",
    style: "Claymation"
  }
];

export function StoryShowcase() {
  return (
    <section id="showcase" className="w-full py-12">
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center perspective-1000">
            {BOOKS.map((book, i) => (
                <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 50, rotateY: 10 }}
                    whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2, duration: 0.8 }}
                    whileHover={{ y: -20, scale: 1.02, rotateY: -5, zIndex: 10 }}
                    className="relative group w-[300px] h-[450px] cursor-pointer"
                >
                    {/* Book Spine Effect */}
                    <div className={`absolute left-0 top-1 bottom-1 w-4 ${book.color} brightness-75 rounded-l-sm transform -translate-x-2 translate-z-[-10px]`} />
                    
                    {/* Main Cover */}
                    <div className={`w-full h-full rounded-r-lg rounded-l-sm shadow-[10px_20px_50px_-10px_rgba(0,0,0,0.3)] overflow-hidden relative ${book.color}`}>
                        {/* Texture Overlay */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-20 z-20 pointer-events-none" />
                        
                        {/* Image */}
                        <Image 
                            src={book.cover} 
                            alt={book.title}
                            fill
                            sizes="340px"
                            className="object-cover opacity-80 mix-blend-overlay group-hover:opacity-60 transition-opacity duration-500"
                        />
                        
                        {/* Title & Info */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-between z-30 text-white">
                            <div>
                                <h3 className="font-serif text-3xl font-bold leading-tight drop-shadow-lg">
                                    {book.title}
                                </h3>
                                <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
                                    <Star className="w-3 h-3 fill-white" />
                                    <span>Starring {book.starring}</span>
                                </div>
                            </div>
                            
                            <div className="border-t border-white/20 pt-4 flex justify-between items-end">
                                <span className="text-xs uppercase tracking-widest opacity-70 font-medium">
                                    {book.style}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white group-hover:text-stone-900 transition-colors">
                                    <Book className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Book Pages Effect (Side) */}
                    <div className="absolute right-0 top-2 bottom-2 w-3 bg-white rounded-r-sm transform translate-x-1 translate-z-[-5px] shadow-inner border-l border-gray-200" 
                        style={{ 
                            backgroundImage: "linear-gradient(to right, #eee 1px, transparent 1px)", 
                            backgroundSize: "2px 100%" 
                        }} 
                    />
                </motion.div>
            ))}
        </div>
        
        <div className="text-center mt-12">
            <p className="text-stone-500 italic font-serif text-lg">
                &quot;The most magical gift I&apos;ve ever given my daughter.&quot; — Sarah J.
            </p>
        </div>
    </section>
  );
}

