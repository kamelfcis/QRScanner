import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-primary">Warda Shamya</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Premium dining experience with digital menu.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Quick Links</h4>
            <ul className="mt-2 space-y-2">
              <li>
                <Link
                  href="/menu"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Menu
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Contact Us</h4>
            <ul className="mt-2 space-y-2">
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span>+966 50 000 0000</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span>info@wardashamya.com</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span>Riyadh, Saudi Arabia</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Warda Shamya. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
