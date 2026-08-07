import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import WelcomePage from './pages/WelcomePage';
import HomePage from './pages/HomePage';
import BlogPage from './pages/BlogPage';

// Структура данных для Блога (содержит PNG картинку)
export interface BlogItem {
  id: string;
  title: { ru: string; ua: string };
  imgSrc: string; 
}

// Структура данных для Материалов
export interface MaterialItem {
  id: string;
  title: { ru: string; ua: string };
}

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [lang, setLang] = useState<'ru' | 'ua'>('ru');

  // Независимое состояние для Блога
  const [favoriteBlogs, setFavoriteBlogs] = useState<BlogItem[]>(() => {
    try {
      const saved = localStorage.getItem('favoriteBlogs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Независимое состояние для Материалов
  const [favoriteMaterials, setFavoriteMaterials] = useState<MaterialItem[]>(() => {
    try {
      const saved = localStorage.getItem('favoriteMaterials');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Сохранение в localStorage
  useEffect(() => {
    localStorage.setItem('favoriteBlogs', JSON.stringify(favoriteBlogs));
  }, [favoriteBlogs]);

  useEffect(() => {
    localStorage.setItem('favoriteMaterials', JSON.stringify(favoriteMaterials));
  }, [favoriteMaterials]);

  // Обработчик для Блога (WelcomePage)
  const toggleFavoriteBlog = (blog: BlogItem) => {
    setFavoriteBlogs(prev => {
      const exists = prev.some(b => b.id === blog.id);
      if (exists) return prev.filter(b => b.id !== blog.id);
      return [...prev, blog];
    });
  };

  // Обработчик для Материалов (HomePage)
  const toggleFavoriteMaterial = (material: MaterialItem) => {
    setFavoriteMaterials(prev => {
      const exists = prev.some(m => m.id === material.id);
      if (exists) return prev.filter(m => m.id !== material.id);
      return [...prev, material];
    });
  };

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {screen === 'welcome' && (
          <WelcomePage 
            key="welcome" 
            setScreen={setScreen} 
            lang={lang} 
            setLang={setLang}
            favoriteBlogs={favoriteBlogs} 
          />
        )}
        {screen === 'home' && (
          <HomePage 
            key="home" 
            setScreen={setScreen} 
            lang={lang} 
            favoriteMaterials={favoriteMaterials} 
            toggleFavoriteMaterial={toggleFavoriteMaterial}
          />
        )}
        {screen === 'blog' && (
          <BlogPage 
            key="blog" 
            setScreen={setScreen} 
            lang={lang} 
            favoriteBlogs={favoriteBlogs} 
            toggleFavoriteBlog={toggleFavoriteBlog} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
