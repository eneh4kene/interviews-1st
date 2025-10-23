'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import Logo from '../components/Logo';
import { 
  Target, 
  UserCheck, 
  Bell, 
  Globe, 
  Star, 
  ArrowRight, 
  CheckCircle,
  Users,
  TrendingUp,
  Shield,
  Mail,
  Phone,
  FileText,
  Send,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Play,
  Award,
  Zap,
  Briefcase,
  MapPin,
  Clock,
  Percent,
  Menu,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';


// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.35
    } 
  }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const features = [
  {
    icon: Target,
    title: "Tailored Resumes for Every Role",
    description: "We optimize and adapt your CV for each application so you stand out in any stack."
  },
  {
    icon: UserCheck,
    title: "Dedicated Job Search Manager",
    description: "A real human manages your applications, tracks progress, and keeps your portfolio competitive."
  },
  {
    icon: Bell,
    title: "Instant Interview Alerts",
    description: "The moment we secure an interview for you, you'll get all the details — and nothing before then."
  },
  {
    icon: Globe,
    title: "Preferences Handled",
    description: "Visa requirements? Remote-only? Location-specific? We'll only send you roles that match."
  }
];

const testimonials = [
  {
    name: "Alex Johnson",
    role: "Software Engineer",
    content: "Within two weeks, I had three interviews lined up. The best part? I didn't have to lift a finger.",
    rating: 5,
    avatar: "AJ"
  },
  {
    name: "Priya Desai",
    role: "Marketing Specialist",
    content: "They found me a perfect hybrid role in London. I paid £10 only after accepting the interview invite. Worth every penny.",
    rating: 5,
    avatar: "PD"
  },
  {
    name: "Sam Carter",
    role: "UX Designer",
    content: "No noise, no wasted time. They only contacted me when it mattered — with an actual interview.",
    rating: 5,
    avatar: "SC"
  }
];

const stats = [
  { value: "4,200+", label: "interviews scheduled", icon: Calendar },
  { value: "68%", label: "accept-to-screen rate", icon: Percent },
  { value: "12 days", label: "median time to first interview", icon: Clock }
];

const howItWorks = [
  {
    step: 1,
    title: "Tell us your goals & preferences",
    description: "Locations, remote/hybrid, visa requirements.",
    icon: MapPin
  },
  {
    step: 2,
    title: "We tailor and apply for you",
    description: "Role-specific resumes and targeted applications.",
    icon: FileText
  },
  {
    step: 3,
    title: "Accept & pay when it's real",
    description: "Interview secured → you pay £10 only if you accept.",
    icon: CheckCircle
  }
];

export default function Home() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();


  useEffect(() => {
    if (!isAutoPlaying || reducedMotion) return;
    
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isAutoPlaying, reducedMotion]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen) {
        const target = event.target as Element;
        if (!target.closest('header')) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-white dark:from-[#0f1530] dark:via-[#0B1020] dark:to-[#0B1020]">
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-surface/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                    <Logo size="md" className="text-text" />
                    
                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-4">
                      <Link href="/jobs">
                        <Button variant="ghost" size="sm" className="text-text hover:bg-surface">
                          Browse Jobs
                        </Button>
                      </Link>
                      <Link href="/login">
                        <Button variant="outline" size="sm" className="border-border text-text hover:bg-surface">
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/signup/client">
                        <Button size="sm" className="bg-primary hover:bg-primary-600 text-white">
                          Get Started
                        </Button>
                      </Link>
                    </div>

                    {/* Mobile Menu Button - Right Side */}
                    <button
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="md:hidden p-2 rounded-md text-text hover:bg-surface transition-all duration-200 hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center relative z-10 bg-white"
                      aria-label="Toggle mobile menu"
                    >
                      <div className="transition-transform duration-300 ease-out">
                        {isMobileMenuOpen ? <X size={24} className="rotate-180" /> : <Menu size={24} className="rotate-0" />}
                      </div>
                    </button>
                  </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-border/50 bg-surface/95 backdrop-blur-sm animate-slide-in-up">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <Link href="/jobs" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-text hover:bg-surface min-h-[44px] transition-all duration-200 hover:scale-[1.02] hover:shadow-sm">
                    Browse Jobs
                  </Button>
                </Link>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-start border-border text-text hover:bg-surface min-h-[44px] transition-all duration-200 hover:scale-[1.02] hover:shadow-sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup/client" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full justify-start bg-primary hover:bg-primary-600 text-white min-h-[44px] transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section - Split Layout */}
      <motion.section 
        className="relative overflow-hidden"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={fadeUp}
      >
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div 
              className="text-left"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1 
                className="text-4xl md:text-6xl font-bold text-text mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Land Interviews.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                  Leave the Hard Work to Us.
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-xl text-muted mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                We do the legwork—resumes, applications, and follow-ups—so you can focus on acing the interview.
              </motion.p>

              <motion.div 
                className="inline-flex items-center bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30 px-4 py-2 rounded-full text-sm font-medium mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Pay only £10 when you accept an interview
              </motion.div>

              <motion.div 
                className="bg-gray-50/80 border border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 rounded-2xl p-6 mb-8 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <p className="text-lg text-gray-900 dark:text-gray-100 font-medium">
                  ✨ You'll only hear from us when we've secured you an interview. No spam. No endless updates. Just results.
                </p>
              </motion.div>

              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                <Link href="/signup/client">
                  <Button 
                    size="lg" 
                    className="bg-primary hover:bg-primary-600 active:bg-primary-700 text-white shadow-brand transition-[transform,box-shadow] duration-normal ease-brand hover:shadow-lg hover:-translate-y-0.5 text-lg px-8 py-4"
                  >
                    Get Started
                    <motion.div
                      className="ml-2"
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight className="h-5 w-5" />
                    </motion.div>
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-4 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
                  onClick={() => scrollToSection('how-it-works')}
                >
                  How it works
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Content - Animated Mock */}
            <motion.div 
              className="hidden lg:block relative ml-8"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="relative">
                {/* Card Stack Animation */}
                <motion.div 
                  className="absolute top-0 left-0 w-64 h-40 bg-surface rounded-lg shadow-brand border border-border p-4"
                  animate={reducedMotion ? {} : { 
                    y: [0, -10, 0],
                    rotate: [-2, 2, -2]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="flex items-center mb-3">
                    <FileText className="h-5 w-5 text-primary mr-2" />
                    <span className="font-medium text-text">Resume tailored</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-blue-400 rounded-full"></div>
                    <div className="h-2 bg-blue-300 rounded-full w-4/5"></div>
                  </div>
                </motion.div>

                <motion.div 
                  className="absolute top-8 left-8 w-64 h-40 bg-surface rounded-lg shadow-brand border border-border p-4"
                  animate={reducedMotion ? {} : { 
                    y: [0, -8, 0],
                    rotate: [-1, 1, -1]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                >
                  <div className="flex items-center mb-3">
                    <Send className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="font-medium text-text">Application sent</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-purple-400 rounded-full"></div>
                    <div className="h-2 bg-purple-300 rounded-full w-3/4"></div>
                  </div>
                </motion.div>

                <motion.div 
                  className="absolute top-16 left-16 w-64 h-40 bg-surface rounded-lg shadow-brand border border-border p-4"
                  animate={reducedMotion ? {} : { 
                    y: [0, -6, 0],
                    rotate: [0, 0, 0]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                  }}
                >
                  <div className="flex items-center mb-3">
                    <Calendar className="h-5 w-5 text-success mr-2" />
                    <span className="font-medium text-text">Interview booked</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-green-400 rounded-full"></div>
                    <div className="h-2 bg-green-300 rounded-full w-2/3"></div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Trust Bar */}
      <motion.section 
        className="py-8 bg-surface border-y border-border"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={fadeUp}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="ml-2 text-text font-medium">Rated 4.9/5 by job seekers</span>
            </div>
            
            <div className="flex items-center gap-8 opacity-70 dark:opacity-80">
              <span className="text-muted text-sm">Seen at:</span>
              <div className="flex items-center gap-6">
                <div className="w-16 h-8 bg-border rounded flex items-center justify-center text-xs text-muted">TechCrunch</div>
                <div className="w-16 h-8 bg-border rounded flex items-center justify-center text-xs text-muted">Forbes</div>
                <div className="w-16 h-8 bg-border rounded flex items-center justify-center text-xs text-muted">BBC</div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section 
        id="how-it-works" 
        className="py-20 bg-surface"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={fadeUp}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text mb-6">
              How It Works
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Three simple steps to land your next interview
            </p>
          </motion.div>

          <div className="relative">
            {/* Progress Line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-border transform -translate-y-1/2 z-0"></div>
            
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {howItWorks.map((step, index) => (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  className="text-center"
                >
                  <div className="relative">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center mb-6 relative z-10">
                      <step.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-surface rounded-full border-4 border-border flex items-center justify-center text-sm font-bold text-text z-20">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-text mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        className="py-20 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-[#0f1530] dark:to-[#1a1f3a]"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={fadeUp}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text mb-6">
              Why Choose InterviewsFirst?
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              We've revolutionized job searching by putting results first and eliminating the noise.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.3 } }}
              >
                <Card className="h-full bg-surface border border-border shadow-brand hover:shadow-lg transition-transform duration-fast ease-brand group">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-text">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <CardDescription className="text-muted text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Results & Stats */}
      <motion.section 
        className="py-20 bg-surface"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={fadeUp}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text mb-6">
              Real outcomes, not promises.
            </h2>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeUp}
                className="text-center"
              >
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-success to-success-2 rounded-full flex items-center justify-center mb-6">
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-text mb-2">
                  {stat.value}
                </div>
                <div className="text-muted">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <p className="text-sm text-muted">
              Sample metrics from recent cohorts; results vary.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section 
        className="py-20 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-[#0f1530] dark:to-[#1a1f3a]"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={fadeUp}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text mb-6">
              What Our Talents Say
            </h2>
            <p className="text-xl text-muted">
              Real results from real job seekers who trusted us with their careers.
            </p>
          </motion.div>

          <motion.div 
            className="relative"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            onHoverStart={() => setIsAutoPlaying(false)}
            onHoverEnd={() => setIsAutoPlaying(true)}
          >
            <Card className="bg-surface border border-border shadow-brand">
              <CardContent className="p-12">
                <div className="flex mb-6">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-text text-xl mb-8 italic leading-relaxed">
                  "{testimonials[currentTestimonial].content}"
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                      {testimonials[currentTestimonial].avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-text">{testimonials[currentTestimonial].name}</p>
                      <p className="text-muted">{testimonials[currentTestimonial].role}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevTestimonial}
                      className="w-10 h-10 p-0 border-border text-text hover:bg-surface"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextTestimonial}
                      className="w-10 h-10 p-0 border-border text-text hover:bg-surface"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dots */}
            <div className="flex justify-center mt-6 gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentTestimonial ? 'bg-primary' : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Pricing Section */}
      <motion.section 
        className="py-20 bg-surface"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={fadeUp}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text mb-6">
              Free until you accept an interview.
            </h2>
            <p className="text-xl text-muted mb-12 max-w-3xl mx-auto">
              We believe in paying for results, not promises. Sign up for free, let us do the legwork, and pay just £10 when you accept an interview we've secured for you. No interviews, no cost. Ever.
            </p>

            <Card className="max-w-md mx-auto bg-surface border border-border shadow-brand">
              <CardContent className="p-12">
                <div className="text-6xl font-bold text-success mb-4">£10</div>
                <p className="text-lg text-text mb-6">
                  Only when you accept an interview
                </p>
                <div className="space-y-3 text-left">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-success mr-3" />
                    <span className="text-text">Free signup</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-success mr-3" />
                    <span className="text-text">No monthly fees</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-success mr-3" />
                    <span className="text-text">Pay only for results</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* Final CTA Section */}
      <motion.section 
        id="signup" 
        className="py-20 bg-gradient-to-r from-primary to-purple-600 relative overflow-hidden"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={fadeUp}
      >
        {/* Background Visual */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10">
            <motion.div
              animate={reducedMotion ? {} : { 
                y: [0, -20, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <CheckCircle className="h-32 w-32 text-white" />
            </motion.div>
          </div>
          <div className="absolute bottom-10 left-10">
            <motion.div
              animate={reducedMotion ? {} : { 
                y: [0, 20, 0],
                rotate: [0, -5, 0]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            >
              <Briefcase className="h-24 w-24 text-white" />
            </motion.div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Start Your Job Search the Smarter Way
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Create your free account and let us get to work.
            </p>
            
            <Link href="/signup/client">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-gray-100 shadow-brand transition-[transform,box-shadow] duration-normal ease-brand hover:shadow-lg hover:-translate-y-0.5 text-lg px-8 py-4 mb-6"
              >
                Get Started for Free
                <motion.div
                  className="ml-2"
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.div>
              </Button>
            </Link>
            
            <p className="text-blue-200 text-sm">
              Trusted by job seekers across the UK
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-[#0c1328] dark:bg-[#0a0f1a] text-zinc-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Logo size="lg" className="text-white mb-4" />
              <p className="text-zinc-400 mb-6 max-w-md">
                The smart way to land your next job. We handle the hard work, you focus on success.
              </p>
              <div className="flex space-x-4">
                <Link href="/about" className="text-zinc-400 hover:text-white transition-colors">
                  About
                </Link>
                <Link href="/how-it-works" className="text-zinc-400 hover:text-white transition-colors">
                  How It Works
                </Link>
                <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Contact</h4>
              <div className="space-y-2 text-zinc-400">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>support@interviewsfirst.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>+44 20 1234 5678</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/login" className="block text-zinc-400 hover:text-white transition-colors">
                  Login
                </Link>
                <Link href="/signup/client" className="block text-zinc-400 hover:text-white transition-colors">
                  Sign Up
                </Link>
                <Link href="/contact" className="block text-zinc-400 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-zinc-800 mt-12 pt-8 text-center text-zinc-400">
            <p>&copy; 2024 InterviewsFirst. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 