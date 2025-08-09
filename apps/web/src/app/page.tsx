'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
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
  Percent
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
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
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isAutoPlaying || reducedMotion) return;
    
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isAutoPlaying, reducedMotion]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section - Split Layout */}
      <section className="relative overflow-hidden">
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
                className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Land Interviews.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Leave the Hard Work to Us.
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-xl text-gray-600 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                We do the legwork—resumes, applications, and follow-ups—so you can focus on acing the interview.
              </motion.p>

              <motion.div 
                className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Pay only £10 when you accept an interview
              </motion.div>

              <motion.div 
                className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <p className="text-lg text-blue-800 font-medium">
                  ✨ You'll only hear from us when we've secured you an interview. No spam. No endless updates. Just results.
                </p>
              </motion.div>

              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => scrollToSection('signup')}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-4"
                  onClick={() => scrollToSection('how-it-works')}
                >
                  How it works
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Content - Animated Mock */}
            <motion.div 
              className="hidden lg:block relative"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="relative">
                {/* Card Stack Animation */}
                <motion.div 
                  className="absolute top-0 left-0 w-64 h-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [-2, 2, -2]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="flex items-center mb-2">
                    <FileText className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-gray-800">Resume tailored</span>
                  </div>
                  <div className="h-2 bg-green-200 rounded-full mb-2"></div>
                  <div className="h-2 bg-green-200 rounded-full w-3/4"></div>
                </motion.div>

                <motion.div 
                  className="absolute top-8 left-8 w-64 h-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
                  animate={{ 
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
                  <div className="flex items-center mb-2">
                    <Send className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="font-medium text-gray-800">Application sent</span>
                  </div>
                  <div className="h-2 bg-purple-200 rounded-full mb-2"></div>
                  <div className="h-2 bg-purple-200 rounded-full w-2/3"></div>
                </motion.div>

                <motion.div 
                  className="absolute top-16 left-16 w-64 h-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
                  animate={{ 
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
                  <div className="flex items-center mb-2">
                    <Calendar className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-gray-800">Interview booked</span>
                  </div>
                  <div className="h-2 bg-green-200 rounded-full mb-2"></div>
                  <div className="h-2 bg-green-200 rounded-full w-full"></div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-8 bg-white border-y border-gray-200">
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
              <span className="ml-2 text-gray-700 font-medium">Rated 4.9/5 by job seekers</span>
            </div>
            
            <div className="flex items-center gap-8 opacity-60">
              <span className="text-gray-500 text-sm">Seen at:</span>
              <div className="flex items-center gap-6">
                <div className="w-16 h-8 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-600">TechCrunch</div>
                <div className="w-16 h-8 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-600">Forbes</div>
                <div className="w-16 h-8 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-600">BBC</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Three simple steps to land your next interview
            </p>
          </motion.div>

          <div className="relative">
            {/* Progress Line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 transform -translate-y-1/2 z-0"></div>
            
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
                  variants={fadeInUp}
                  className="text-center"
                >
                  <div className="relative">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 relative z-10">
                      <step.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-white rounded-full border-4 border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 z-20">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose Interview Me?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
                variants={fadeInUp}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white group">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <CardDescription className="text-gray-600 text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Results & Stats */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
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
                variants={fadeInUp}
                className="text-center"
              >
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6">
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">
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
            <p className="text-sm text-gray-500">
              Sample metrics from recent cohorts; results vary.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              What Our Clients Say
            </h2>
            <p className="text-xl text-gray-600">
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
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-12">
                <div className="flex mb-6">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-gray-700 text-xl mb-8 italic leading-relaxed">
                  "{testimonials[currentTestimonial].content}"
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                      {testimonials[currentTestimonial].avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonials[currentTestimonial].name}</p>
                      <p className="text-gray-600">{testimonials[currentTestimonial].role}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevTestimonial}
                      className="w-10 h-10 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextTestimonial}
                      className="w-10 h-10 p-0"
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
                    index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Free until you accept an interview.
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              We believe in paying for results, not promises. Sign up for free, let us do the legwork, and pay just £10 when you accept an interview we've secured for you. No interviews, no cost. Ever.
            </p>

            <Card className="max-w-md mx-auto border-0 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-12">
                <div className="text-6xl font-bold text-green-600 mb-4">£10</div>
                <p className="text-lg text-gray-700 mb-6">
                  Only when you accept an interview
                </p>
                <div className="space-y-3 text-left">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Free signup</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">No monthly fees</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Pay only for results</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="signup" className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
        {/* Background Visual */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10">
            <motion.div
              animate={{ 
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
              animate={{ 
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
            
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 mb-6"
              onClick={() => scrollToSection('signup')}
            >
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-blue-200 text-sm">
              Trusted by job seekers across the UK
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">Interview Me</h3>
              <p className="text-gray-400 mb-6 max-w-md">
                The smart way to land your next job. We handle the hard work, you focus on success.
              </p>
              <div className="flex space-x-4">
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  About
                </Link>
                <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                  How It Works
                </Link>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-gray-400">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>support@interview-me.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>+44 20 1234 5678</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/login" className="block text-gray-400 hover:text-white transition-colors">
                  Login
                </Link>
                <Link href="/signup" className="block text-gray-400 hover:text-white transition-colors">
                  Sign Up
                </Link>
                <Link href="/contact" className="block text-gray-400 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Interview Me. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 