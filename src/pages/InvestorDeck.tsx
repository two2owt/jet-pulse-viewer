import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Building2, 
  DollarSign, 
  Target, 
  Rocket,
  MapPin,
  Bell,
  Heart,
  Share2,
  Crown,
  ArrowLeft,
  Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const InvestorDeck = () => {
  const navigate = useNavigate();
  const [userBase, setUserBase] = useState([10000]);
  const [merchantCount, setMerchantCount] = useState([50]);
  const [conversionRate, setConversionRate] = useState([20]);
  const [cities, setCities] = useState([1]);

  // Calculate projections
  const freeUsers = userBase[0] * (1 - conversionRate[0] / 100);
  const jetPlusUsers = userBase[0] * (conversionRate[0] / 100) * 0.75;
  const jetXUsers = userBase[0] * (conversionRate[0] / 100) * 0.25;
  
  const consumerMRR = (jetPlusUsers * 6.99) + (jetXUsers * 12.99);
  const merchantMRR = merchantCount[0] * 125; // Average $125/merchant
  const totalMRR = (consumerMRR + merchantMRR) * cities[0];
  const arr = totalMRR * 12;
  const valuation = arr * 7; // 7x ARR multiple

  // Generate projection data
  const generateProjectionData = () => {
    const months = ['M1', 'M3', 'M6', 'M9', 'M12', 'M18', 'M24'];
    const growthRates = [1, 1.5, 2.5, 4, 6, 12, 20];
    
    return months.map((month, i) => ({
      month,
      users: Math.round(userBase[0] * growthRates[i]),
      mrr: Math.round(totalMRR * growthRates[i]),
      merchants: Math.round(merchantCount[0] * growthRates[i] * 0.8),
    }));
  };

  const projectionData = generateProjectionData();

  const revenueBreakdown = [
    { name: 'JET+ Subs', value: jetPlusUsers * 6.99, color: 'hsl(var(--primary))' },
    { name: 'JETx Subs', value: jetXUsers * 12.99, color: 'hsl(var(--accent))' },
    { name: 'Merchant Fees', value: merchantMRR, color: 'hsl(var(--secondary))' },
  ];

  const competitiveAdvantages = [
    { icon: MapPin, title: "Hyperlocal Focus", desc: "Neighborhood-level geofencing for precise deal targeting" },
    { icon: Bell, title: "Smart Notifications", desc: "Location-triggered push notifications drive 3x engagement" },
    { icon: Users, title: "Social Discovery", desc: "Friend connections increase retention by 40%" },
    { icon: Building2, title: "Two-Sided Marketplace", desc: "Network effects from merchant-consumer flywheel" },
  ];

  const marketOpportunity = [
    { segment: "Restaurant Deals", tam: 45, sam: 12, som: 2 },
    { segment: "Nightlife", tam: 28, sam: 8, som: 1.5 },
    { segment: "Events", tam: 35, sam: 10, som: 1.8 },
    { segment: "Local Services", tam: 52, sam: 15, som: 2.5 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold">JET Investor Deck</h1>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <Badge variant="secondary" className="mb-4">Series Seed Ready</Badge>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            JET
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The hyperlocal deal discovery platform connecting consumers with neighborhood venues through geofenced promotions
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">${(totalMRR / 1000).toFixed(1)}K</p>
              <p className="text-sm text-muted-foreground">Projected MRR</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{cities[0]}</p>
              <p className="text-sm text-muted-foreground">Markets</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">${(valuation / 1000000).toFixed(1)}M</p>
              <p className="text-sm text-muted-foreground">Valuation (7x ARR)</p>
            </div>
          </div>
        </section>

        <Tabs defaultValue="projections" className="space-y-6">
          <TabsList className="grid grid-cols-4 max-w-xl mx-auto">
            <TabsTrigger value="projections">Projections</TabsTrigger>
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>

          {/* Financial Projections */}
          <TabsContent value="projections" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Interactive Controls */}
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Scenario Modeling
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <label className="text-sm text-muted-foreground">User Base</label>
                      <span className="text-sm font-medium">{userBase[0].toLocaleString()}</span>
                    </div>
                    <Slider
                      value={userBase}
                      onValueChange={setUserBase}
                      min={1000}
                      max={100000}
                      step={1000}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <label className="text-sm text-muted-foreground">Merchants</label>
                      <span className="text-sm font-medium">{merchantCount[0]}</span>
                    </div>
                    <Slider
                      value={merchantCount}
                      onValueChange={setMerchantCount}
                      min={10}
                      max={500}
                      step={10}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <label className="text-sm text-muted-foreground">Conversion Rate</label>
                      <span className="text-sm font-medium">{conversionRate[0]}%</span>
                    </div>
                    <Slider
                      value={conversionRate}
                      onValueChange={setConversionRate}
                      min={5}
                      max={40}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <label className="text-sm text-muted-foreground">Cities</label>
                      <span className="text-sm font-medium">{cities[0]}</span>
                    </div>
                    <Slider
                      value={cities}
                      onValueChange={setCities}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Revenue Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-2xl font-bold text-primary">${totalMRR.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
                    </div>
                    <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <p className="text-2xl font-bold text-accent">${arr.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Annual Recurring Revenue</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                      <p className="text-2xl font-bold text-secondary-foreground">${(consumerMRR * cities[0]).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Consumer Revenue</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <p className="text-2xl font-bold">${(merchantMRR * cities[0]).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Merchant Revenue</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Est. Valuation (7x ARR)</span>
                      <span className="text-2xl font-bold text-primary">${(valuation / 1000000).toFixed(2)}M</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Growth Chart */}
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  24-Month Growth Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projectionData}>
                      <defs>
                        <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'MRR']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="mrr" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorMrr)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Model */}
          <TabsContent value="model" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Revenue Streams */}
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle>Revenue Streams</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {revenueBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`$${value.toFixed(0)}`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {revenueBreakdown.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">${item.value.toFixed(0)}/mo</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Tiers */}
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle>Subscription Tiers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">JET Free</span>
                      <Badge variant="outline">$0/mo</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Core deal discovery, favorites, basic features</p>
                    <p className="text-xs text-muted-foreground mt-2">~{Math.round(freeUsers).toLocaleString()} users</p>
                  </div>

                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium flex items-center gap-2">
                        <Heart className="w-4 h-4 text-primary" />
                        JET+
                      </span>
                      <Badge className="bg-primary">$6.99/mo</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Social features, friend connections, sharing</p>
                    <p className="text-xs text-muted-foreground mt-2">~{Math.round(jetPlusUsers).toLocaleString()} users</p>
                  </div>

                  <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium flex items-center gap-2">
                        <Crown className="w-4 h-4 text-accent" />
                        JETx
                      </span>
                      <Badge className="bg-accent text-accent-foreground">$12.99/mo</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">VIP deals, concierge, priority access</p>
                    <p className="text-xs text-muted-foreground mt-2">~{Math.round(jetXUsers).toLocaleString()} users</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Competitive Advantages */}
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  Competitive Advantages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {competitiveAdvantages.map((adv, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border">
                      <adv.icon className="w-8 h-8 text-primary mb-3" />
                      <h4 className="font-medium mb-1">{adv.title}</h4>
                      <p className="text-sm text-muted-foreground">{adv.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market Opportunity */}
          <TabsContent value="market" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Market Opportunity (TAM/SAM/SOM)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={marketOpportunity} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}B`} />
                      <YAxis dataKey="segment" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`$${value}B`, '']}
                      />
                      <Bar dataKey="tam" fill="hsl(var(--muted))" name="TAM" />
                      <Bar dataKey="sam" fill="hsl(var(--secondary))" name="SAM" />
                      <Bar dataKey="som" fill="hsl(var(--primary))" name="SOM" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-muted" />
                    <span className="text-sm text-muted-foreground">TAM (Total)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-secondary" />
                    <span className="text-sm text-muted-foreground">SAM (Serviceable)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary" />
                    <span className="text-sm text-muted-foreground">SOM (Obtainable)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-primary">$160B</p>
                  <p className="text-sm text-muted-foreground mt-2">Total Addressable Market</p>
                  <p className="text-xs text-muted-foreground">US Local Discovery & Deals</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-secondary-foreground">$45B</p>
                  <p className="text-sm text-muted-foreground mt-2">Serviceable Market</p>
                  <p className="text-xs text-muted-foreground">Urban Nightlife & Dining</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-accent">$7.8B</p>
                  <p className="text-sm text-muted-foreground mt-2">Obtainable Market</p>
                  <p className="text-xs text-muted-foreground">Year 3 Target Cities</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Growth Strategy */}
          <TabsContent value="strategy" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle>Go-to-Market Strategy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">1</div>
                      <div>
                        <h4 className="font-medium">City-by-City Launch</h4>
                        <p className="text-sm text-muted-foreground">Deep penetration in Charlotte, then expand to similar markets (Raleigh, Nashville, Austin)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">2</div>
                      <div>
                        <h4 className="font-medium">Merchant Onboarding</h4>
                        <p className="text-sm text-muted-foreground">Target 25+ anchor venues per neighborhood to create deal density</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">3</div>
                      <div>
                        <h4 className="font-medium">Viral Growth Loops</h4>
                        <p className="text-sm text-muted-foreground">Social sharing, friend referrals, and deal sharing drive organic acquisition</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">4</div>
                      <div>
                        <h4 className="font-medium">Premium Conversion</h4>
                        <p className="text-sm text-muted-foreground">Push notifications and social features drive subscription upgrades</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle>Milestones & Roadmap</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative pl-4 border-l-2 border-primary/30 space-y-6">
                    <div className="relative">
                      <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-primary" />
                      <Badge variant="outline" className="mb-1">Q4 2024</Badge>
                      <h4 className="font-medium">Charlotte Launch</h4>
                      <p className="text-sm text-muted-foreground">5 neighborhoods, 25+ merchants, 1K users</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-primary/60" />
                      <Badge variant="outline" className="mb-1">Q1 2025</Badge>
                      <h4 className="font-medium">Product-Market Fit</h4>
                      <p className="text-sm text-muted-foreground">10K users, 100 merchants, $15K MRR</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-primary/40" />
                      <Badge variant="outline" className="mb-1">Q2 2025</Badge>
                      <h4 className="font-medium">Second Market</h4>
                      <p className="text-sm text-muted-foreground">Expand to Raleigh-Durham, 25K total users</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-primary/20" />
                      <Badge variant="outline" className="mb-1">Q4 2025</Badge>
                      <h4 className="font-medium">Series A Ready</h4>
                      <p className="text-sm text-muted-foreground">5 cities, 100K users, $150K MRR</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Use of Funds */}
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Use of Funds (Seed Round)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <p className="text-2xl font-bold text-primary">40%</p>
                    <p className="text-sm font-medium mt-1">Engineering</p>
                    <p className="text-xs text-muted-foreground">Product development & infrastructure</p>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 text-center">
                    <p className="text-2xl font-bold text-accent">30%</p>
                    <p className="text-sm font-medium mt-1">Growth</p>
                    <p className="text-xs text-muted-foreground">Marketing & user acquisition</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20 text-center">
                    <p className="text-2xl font-bold text-secondary-foreground">20%</p>
                    <p className="text-sm font-medium mt-1">Sales</p>
                    <p className="text-xs text-muted-foreground">Merchant onboarding team</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
                    <p className="text-2xl font-bold">10%</p>
                    <p className="text-sm font-medium mt-1">Operations</p>
                    <p className="text-xs text-muted-foreground">Legal, admin, reserves</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <section className="text-center py-12 border-t border-border">
          <h2 className="text-2xl font-bold mb-4">Ready to Discuss?</h2>
          <p className="text-muted-foreground mb-6">Let's explore how JET can transform local discovery</p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Schedule Call
            </Button>
            <Button size="lg" variant="outline">
              Download Deck
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default InvestorDeck;
