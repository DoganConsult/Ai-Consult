import { Mail, Phone, MapPin, Linkedin, Twitter, Globe, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COMPANY_INFO, ROUTES, DOMAINS } from './shared/constants';

export function Footer() {
  return (
    <footer id="contact" className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white">D</span>
              </div>
              <span className="text-white">Dogan Consult</span>
            </div>
            <p className="text-gray-400">
              Leading AI and ICT consulting engineering company delivering enterprise-grade solutions across Saudi Arabia.
            </p>
            <div className="flex gap-4">
              <a href={COMPANY_INFO.social.linkedin} className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href={COMPANY_INFO.social.twitter} className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href={COMPANY_INFO.social.website} className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="text-white mb-4">Ecosystem</h4>
            <ul className="space-y-3">
              <li>
                <Link to={ROUTES.doganHub} className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                  <LayoutGrid className="w-3 h-3" />
                  <span>DoganHub ({DOMAINS.doganHub})</span>
                </Link>
              </li>
              <li>
                <Link to={ROUTES.saudiBusinessGate} className="hover:text-blue-400 transition-colors">
                  Saudi Business Gate
                </Link>
              </li>
              <li>
                <Link to={ROUTES.shahinAI} className="hover:text-blue-400 transition-colors">
                  Shahin AI
                </Link>
              </li>
              <li>
                <Link to={ROUTES.doganLab} className="hover:text-blue-400 transition-colors">
                  DoganLab
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white mb-4">Services</h4>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Custom Development</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Cloud Migration</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Data Integration</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Security Audit</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Consulting</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                <span>{COMPANY_INFO.address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                <a href={`tel:${COMPANY_INFO.phone}`} className="hover:text-blue-400 transition-colors">{COMPANY_INFO.phoneDisplay}</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                <a href={`mailto:${COMPANY_INFO.email}`} className="hover:text-blue-400 transition-colors">{COMPANY_INFO.email}</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400">
              © 2024 Dogan Consult. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
