import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, Linkedin, Mail } from 'lucide-react';
import LetterGlitch from '../components/ui/LetterGlitch';
import TextShuffle from '../components/ui/TextShuffle';
import ProfileCard from '../components/ui/ProfileCard';

const AboutDevs: React.FC = () => {
  const navigate = useNavigate();
  const [shuffleTrigger, setShuffleTrigger] = useState(false);

  // Trigger shuffle animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShuffleTrigger(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const developers = [
    {
      name: 'Pulastya',
      title: 'Full Stack Developer',
      handle: 'pulastya',
      status: 'Building cool stuff',
      avatarUrl: '/images/pulastya.jpg',
      github: 'https://github.com/Pulastya-B',
      linkedin: 'https://www.linkedin.com/in/pulastya-bhagwat/'
    },
    {
      name: 'Mohit',
      title: 'Full Stack Developer',
      handle: 'mohit',
      status: 'Creating the future',
      avatarUrl: '/images/mohit.jpg',
      github: 'https://github.com/Surfing-Ninja',
      linkedin: 'https://www.linkedin.com/in/mohit-khalote/'
    }
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* LetterGlitch Background - Brighter colors */}
      <div className="absolute inset-0 z-0">
        <LetterGlitch
          glitchColors={['#353736ff', '#5d6e07ff', '#0c6719ff', '#f2131384']}
          glitchSpeed={10}
          centerVignette={false}
          outerVignette={true}
          smooth={true}
        />
      </div>

      {/* Light Gradient Overlay for depth - much lighter */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />

      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/30 hover:text-white transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Title Section */}
        <div className="flex-shrink-0 pt-24 pb-8 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold mb-4 text-white">
              <TextShuffle 
                as="span"
                speed={1.5}
                scrambleSpeed={40}
                stagger={0.04}
                delay={0.2}
                trigger={shuffleTrigger}
                loop={true}
                loopDelay={3}
                className="inline-block"
              >
                The Minds Behind क्रेता-बन्धु
              </TextShuffle>
            </h1>
            <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mt-6">
              Meet the developers who brought this{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400">voice-powered</span> customer support agent to life.
            </p>
          </div>
        </div>

        {/* Profile Cards Section */}
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 lg:gap-24">
            {developers.map((dev, index) => (
              <div key={dev.name} className="relative group">
                {/* Rainbow glow effect behind card to match holographic theme */}
                <div className="absolute -inset-6 bg-gradient-to-r from-purple-500/10 via-cyan-400/10 to-pink-500/10 rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <ProfileCard
                  avatarUrl={dev.avatarUrl}
                  name={dev.name}
                  title={dev.title}
                  handle={dev.handle}
                  status={dev.status}
                  contactText="Connect"
                  showUserInfo={true}
                  enableTilt={true}
                  onContactClick={() => window.open(dev.linkedin, '_blank')}
                />

                {/* Social Links - Holographic style */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <a
                    href={dev.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/30 hover:text-white hover:shadow-[0_0_20px_rgba(125,190,255,0.4)] transition-all duration-300"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                  <a
                    href={dev.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/30 hover:text-white hover:shadow-[0_0_20px_rgba(125,190,255,0.4)] transition-all duration-300"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a
                    href={`mailto:${dev.handle}@example.com`}
                    className="p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/30 hover:text-white hover:shadow-[0_0_20px_rgba(125,190,255,0.4)] transition-all duration-300"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default AboutDevs;
