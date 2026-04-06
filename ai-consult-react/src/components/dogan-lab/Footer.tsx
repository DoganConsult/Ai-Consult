import { Mail, Phone, MapPin, Beaker, Linkedin, Twitter, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COMPANY_INFO, ROUTES, DOMAINS } from '../shared/constants';

export function Footer() {
  return (
    <footer className="bg-black border-t border-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Beaker className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-white block font-bold">DoganLab</span>
                <span className="text-xs text-purple-400">Innovation Center</span>
              </div>
            </div>
            <p className="text-gray-500">
              The experimental arm of Dogan Consult, pushing the boundaries of what's possible in tech.
            </p>
            <div className="flex gap-4">
              <a href={COMPANY_INFO.social.linkedin} className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href={COMPANY_INFO.social.twitter} className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Research Areas */}
          <div>
            <h4 className="text-white mb-4">Research Areas | مجالات البحث</h4>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-purple-400 transition-colors">Generative AI</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors">Computer Vision</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors">Blockchain</a></li>
            </ul>
          </div>

          {/* Network */}
          <div>
            <h4 className="text-white mb-4">Network | الشبكة</h4>
            <ul className="space-y-3">
              <li>
                <Link to={ROUTES.doganHub} className="flex items-center gap-2 hover:text-purple-400 transition-colors">
                  <LayoutGrid className="w-3 h-3" />
                  <span>DoganHub ({DOMAINS.doganHub})</span>
                </Link>
              </li>
              <li>
                <Link to={ROUTES.shahinAI} className="hover:text-purple-400 transition-colors">
                  <span>Shahin AI ({DOMAINS.shahinAI})</span>
                </Link>
              </li>
              <li>
                <Link to={ROUTES.saudiBusinessGate} className="hover:text-purple-400 transition-colors">
                  <span>Saudi Business Gate</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white mb-4">Contact | اتصل بنا</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                <span>{COMPANY_INFO.address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                <a href={`tel:${COMPANY_INFO.phone}`} className="hover:text-purple-400 transition-colors">{COMPANY_INFO.phoneDisplay}</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                <a href={`mailto:${COMPANY_INFO.email}`} className="hover:text-purple-400 transition-colors">{COMPANY_INFO.email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-900 text-center">
          <p className="text-gray-500">
            © 2024 DoganLab by Dogan Consult. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
