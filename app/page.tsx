import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import SiteFooter from '@/components/site-footer'
import {
  HeartPulse, 
  Calendar, 
  Clock, 
  FileText, 
  Bell, 
  MessageSquare,
  Shield,
  Smartphone
} from 'lucide-react'

const features = [
  {
    icon: Calendar,
    title: 'Easy Booking',
    description: 'Book appointments with your preferred doctor anytime, 24/7',
  },
  {
    icon: Clock,
    title: 'Real-time Wait Times',
    description: 'Check estimated waiting times before your visit',
  },
  {
    icon: FileText,
    title: 'Digital Prescriptions',
    description: 'Access your prescriptions and medical leave notes digitally',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Receive automatic email reminders for your appointments',
  },
  {
    icon: MessageSquare,
    title: 'Feedback System',
    description: 'Share your experience anonymously to help us improve',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your health data is protected with enterprise-grade security',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <HeartPulse className="w-6 h-6 text-primary" />
            </div>
            <span className="font-bold text-lg">CCA</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Smartphone className="w-4 h-4" />
            Available 24/7 on any device
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            Campus Clinic{' '}
            <span className="text-primary">Appointment System</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Book appointments online, get instant confirmations, access your prescriptions digitally, 
            and never miss an appointment with automatic reminders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" asChild className="text-base">
              <Link href="/auth/sign-up">
                <Calendar className="mr-2 h-5 w-5" />
                Book Appointment
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <Link href="/auth/login">
                Sign In to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A complete healthcare management solution designed for students
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => (
            <Card key={feature.title} className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get started in just a few simple steps
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Register', desc: 'Create an account with your student number' },
              { step: '2', title: 'Book', desc: 'Select a doctor and choose your preferred time' },
              { step: '3', title: 'Visit', desc: 'Check wait times and attend your appointment' },
              { step: '4', title: 'Access', desc: 'Get digital prescriptions and leave notes' },
            ].map((item, index) => (
              <div key={item.step} className="text-center relative">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-primary text-primary-foreground border-0 max-w-4xl mx-auto">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Join thousands of students who are already managing their health appointments efficiently.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/auth/sign-up">Create Your Account</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </div>
  )
}
