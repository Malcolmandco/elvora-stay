import { Link } from 'react-router-dom';
import { Plane, Check, ArrowRight, Phone, Clock, MapPin, Luggage } from 'lucide-react';

export function AirportPickupPage() {
  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1000px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Airport Pickup</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Complimentary airport pickup
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Every flight booked through Elvora Stay includes complimentary airport
          pickup — a private transfer from the airport to your destination.
        </p>
      </div>

      <div className="mx-auto max-w-[1000px] px-6 pb-20 lg:px-10">
        {/* Highlight banner */}
        <div className="border border-border bg-secondary p-8 md:p-12">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground">
              <Plane className="h-7 w-7 text-background" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Included with every flight booking
              </p>
              <h2 className="mt-1 font-serif text-2xl font-medium text-foreground">
                Free Airport Pickup
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                When you book a flight with Elvora Stay, a private airport pickup
                is included at no additional cost. Your driver will meet you at the
                arrivals hall and take you directly to your hotel or residence.
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-12">
          <h3 className="font-serif text-2xl font-light text-foreground">
            How it works
          </h3>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: Plane,
                title: 'Book your flight',
                desc: 'Search and book your flight through Elvora Stay.',
              },
              {
                icon: Luggage,
                title: 'Add pickup details',
                desc: 'Provide your arrival airport, flight number, and destination address during checkout.',
              },
              {
                icon: MapPin,
                title: 'Meet your driver',
                desc: 'Your driver will be waiting at arrivals with your name. Complimentary, every time.',
              },
            ].map((step, i) => (
              <div key={i} className="border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground">
                  <step.icon className="h-5 w-5 text-background" strokeWidth={1.5} />
                </div>
                <p className="mt-4 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </p>
                <h4 className="mt-1 font-serif text-lg font-medium text-foreground">
                  {step.title}
                </h4>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What's included */}
        <div className="mt-12">
          <h3 className="font-serif text-2xl font-light text-foreground">
            What is included
          </h3>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              'Private vehicle with professional driver',
              'Meet and greet at the arrivals hall',
              'All taxes and tolls included',
              'Luggage assistance',
              'Flight tracking for delays',
              '24/7 customer support',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10">
                  <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
                </div>
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 border border-border bg-card p-8 text-center">
          <h3 className="font-serif text-2xl font-light text-foreground">
            Ready to book your flight?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Airport pickup is automatically included with every flight booking.
          </p>
          <Link
            to="/flights"
            className="mt-6 inline-flex items-center gap-2 bg-foreground px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
          >
            Search Flights
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
