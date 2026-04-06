import { Mail, Phone, MapPin, Handshake, Linkedin, Twitter, Globe, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COMPANY_INFO, ROUTES, DOMAINS } from '../../components/shared/constants';

export function Footer() {
  return (
    <footer id="contact" className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg flex items-center justify-center">
                <Handshake className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-white block">Saudi Business Gate</span>
                <span className="text-xs text-blue-400">بوابة الأعمال السعودية</span>
              </div>
            </div>
            <p className="text-gray-400">
              منصة الأعمال الذكية للمؤسسات والحكومة في المملكة
            </p>
            <div className="flex gap-4">
              <a href={COMPANY_INFO.social.linkedin} className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href={COMPANY_INFO.social.twitter} className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href={COMPANY_INFO.social.website} className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Modules */}
          <div>
            <h4 className="text-white mb-4">Modules | الوحدات</h4>
            <ul className="space-y-3">
              <li><a href="#modules" className="hover:text-blue-400 transition-colors">RFP Intelligence</a></li>
              <li><a href="#modules" className="hover:text-blue-400 transition-colors">GRC Assessment</a></li>
              <li><a href="#modules" className="hover:text-blue-400 transition-colors">Pitch Builder</a></li>
            </ul>
          </div>

          {/* Ecosystem */}
          <div>
            <h4 className="text-white mb-4">Ecosystem | المنظومة</h4>
            <ul className="space-y-3">
              <li>
                <Link to={ROUTES.doganHub} className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                  <LayoutGrid className="w-3 h-3" />
                  <span>DoganHub ({DOMAINS.doganHub})</span>
                </Link>
              </li>
              <li>
                <Link to={ROUTES.shahinAI} className="hover:text-blue-400 transition-colors">
                  Shahin AI ({DOMAINS.shahinAI})
                </Link>
              </li>
              <li>
                <Link to={ROUTES.doganLab} className="hover:text-blue-400 transition-colors">
                  DoganLab ({DOMAINS.doganLab})
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white mb-4">Contact | اتصل بنا</h4>
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
                <a href="mailto:info@doganconsult.com" className="hover:text-blue-400 transition-colors">info@doganconsult.com</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-center md:text-right">
            © 2024 Saudi Business Gate by Dogan Consult. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
