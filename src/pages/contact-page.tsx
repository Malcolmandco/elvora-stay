import { useState } from 'react';
import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && message) {
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }
  };

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Contact</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Get in touch
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Questions about a booking, a property, or your next escape? Our team is here to help.
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Contact info */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-accent" strokeWidth={1.5} />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
                  <p className="text-sm text-foreground">concierge@elvorastay.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-accent" strokeWidth={1.5} />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Phone</p>
                  <p className="text-sm text-foreground">+1 (888) 358-6721</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-accent" strokeWidth={1.5} />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Office</p>
                  <p className="text-sm text-foreground">New York · London · Singapore</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="border border-border bg-card p-12 text-center">
                <h2 className="font-serif text-2xl font-medium text-foreground">Message sent</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Thank you for reaching out. Our team will respond within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-sm font-medium uppercase tracking-wider text-accent hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground" placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Subject</label>
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground" placeholder="How can we help?" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Message</label>
                  <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground" placeholder="Tell us more..." />
                </div>
                <button type="submit" className="inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85">
                  Send Message
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
