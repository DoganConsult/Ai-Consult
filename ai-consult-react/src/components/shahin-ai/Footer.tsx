import { Mail, Phone, MapPin, Shield, Linkedin, Twitter, Globe, LayoutGrid } from 'lucide-react';
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
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-white block">Shahin AI</span>
                <span className="text-xs text-green-400">شاهين</span>
              </div>
            </div>
            <p className="text-gray-400">
              منصة الامتثال والحوكمة الذكية للمؤسسات في المملكة العربية السعودية
            </p>
            <div className="flex gap-4">
              <a href={COMPANY_INFO.social.linkedin} className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href={COMPANY_INFO.social.twitter} className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href={COMPANY_INFO.social.website} className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Platform Features */}
          <div>
            <h4 className="text-white mb-4">Platform | المنصة</h4>
            <ul className="space-y-3">
              <li><a href="#grc" className="hover:text-green-400 transition-colors">GRC Module</a></li>
              <li><a href="#dga" className="hover:text-green-400 transition-colors">DGA Portal</a></li>
              <li><a href="#evidence" className="hover:text-green-400 transition-colors">Evidence Trail</a></li>
            </ul>
          </div>

          {/* Other Platforms */}
          <div>
            <h4 className="text-white mb-4">Ecosystem | المنظومة</h4>
            <ul className="space-y-3">
              <li>
                <Link to={ROUTES.doganHub} className="flex items-center gap-2 hover:text-green-400 transition-colors">
                  <LayoutGrid className="w-3 h-3" />
                  <span>DoganHub ({DOMAINS.doganHub})</span>
                </Link>
              </li>
              <li>
                <Link to={ROUTES.saudiBusinessGate} className="hover:text-green-400 transition-colors">
                  Saudi Business Gate ({DOMAINS.saudiBusinessGate})
                </Link>
              </li>
              <li>
                <Link to={ROUTES.doganLab} className="hover:text-green-400 transition-colors">
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
                <MapPin className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <span>{COMPANY_INFO.address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <a href={`tel:${COMPANY_INFO.phone}`} className="hover:text-green-400 transition-colors">{COMPANY_INFO.phoneDisplay}</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <a href="mailto:info@doganconsult.com" className="hover:text-green-400 transition-colors">info@doganconsult.com</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-center md:text-right">
            © 2024 Shahin AI by Dogan Consult. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
