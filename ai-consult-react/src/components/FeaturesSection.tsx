import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  Handshake, 
  Shield, 
  FlaskConical,
  Users,
  Database,
  Zap, 
  BarChart3,
  CreditCard
} from "lucide-react";

const features = [
  {
    icon: Handshake,
    title: "Saudi Business Gate",
    description: "Leading new technology cooperation with innovators and pioneers. Gateway platform for business excellence in Saudi market.",
    badge: "Tech Leader"
  },
  {
    icon: Shield,
    title: "Shahin AI",
    description: "Compliance clarification and risk management system ensuring adherence to regulations and policy enforcement.",
    badge: "Compliance"
  },
  {
    icon: FlaskConical,
    title: "DoganLab",
    description: "Innovation laboratory with sandbox environments, demo capabilities, and rapid prototyping for testing new ideas.",
    badge: "Innovation"
  },
  {
    icon: Users,
    title: "DoganHub",
    description: "Command Control Center for customer engagement, partner collaboration, and complete ecosystem management.",
    badge: "Command Center"
  },
  {
    icon: Database,
    title: "ERPNext Integration",
    description: "All four platforms seamlessly integrated through ERPNext, providing unified business operations and data flow.",
    badge: "Core Platform"
  },
  {
    icon: Zap,
    title: "Real-Time Processing",
    description: "Enterprise-grade database architecture ensuring data integrity, performance, and instant synchronization.",
    badge: "Performance"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "High-performance analytics engine for lightning-fast insights, predictive intelligence, and business optimization.",
    badge: "Intelligence"
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Enterprise-grade payment processing with multi-layer security, compliance, and fraud prevention.",
    badge: "Commerce"
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4">
            Enterprise-Grade Capabilities
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
            Powerful platforms built on cutting-edge technology, designed for performance, 
            security, and seamless integration.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="relative hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}