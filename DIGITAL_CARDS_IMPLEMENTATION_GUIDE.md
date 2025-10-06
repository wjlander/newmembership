# Digital Membership Cards - Implementation Guide

## Overview
This guide provides a complete step-by-step process to implement digital membership cards that can be added to Google Wallet and Apple Wallet, with QR code verification for member check-ins.

---

## Prerequisites

### 1. Google Wallet Setup
- **Google Cloud Console Account**: Create a project at [console.cloud.google.com](https://console.cloud.google.com)
- **Google Pay & Wallet Console**: Access at [pay.google.com/business/console](https://pay.google.com/business/console)
- **Service Account**: Create a service account with JSON credentials

### 2. Apple Wallet Setup
- **Apple Developer Account**: Required ($99/year) at [developer.apple.com](https://developer.apple.com)
- **Pass Type ID Certificate**: Create in Apple Developer Console
- **Team ID & Pass Type Identifier**: Note these for configuration

### 3. QR Code Generation
- No external service needed - we'll use a library

---

## Step-by-Step Implementation

### Phase 1: Database Setup (15 minutes)

#### 1.1 Create Digital Cards Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Digital membership cards table
CREATE TABLE IF NOT EXISTS digital_membership_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL,
  qr_code_data TEXT NOT NULL,
  google_wallet_url TEXT,
  apple_wallet_url TEXT,
  last_scanned_at TIMESTAMPTZ,
  scan_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_digital_cards_organization_id ON digital_membership_cards(organization_id);
CREATE INDEX idx_digital_cards_profile_id ON digital_membership_cards(profile_id);
CREATE INDEX idx_digital_cards_membership_id ON digital_membership_cards(membership_id);
CREATE INDEX idx_digital_cards_qr_code ON digital_membership_cards(qr_code_data);
CREATE UNIQUE INDEX digital_cards_membership_key ON digital_membership_cards(membership_id);

COMMENT ON TABLE digital_membership_cards IS 'Digital wallet membership cards with QR codes';
```

#### 1.2 Add RLS Policies

```sql
-- Enable RLS
ALTER TABLE digital_membership_cards ENABLE ROW LEVEL SECURITY;

-- Members can view their own cards
CREATE POLICY "Members can view own digital cards"
ON digital_membership_cards FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can view all cards in their organization
CREATE POLICY "Admins can view all digital cards"
ON digital_membership_cards FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);
```

---

### Phase 2: Backend API Setup (2-3 hours)

#### 2.1 Install Required Packages

```bash
npm install qrcode googleapis apple-pass-js uuid
```

#### 2.2 Create API Endpoints Directory Structure

```bash
mkdir -p server/api/digital-cards
touch server/api/digital-cards/generate.ts
touch server/api/digital-cards/google-wallet.ts
touch server/api/digital-cards/apple-wallet.ts
touch server/api/digital-cards/scan.ts
```

#### 2.3 Implement QR Code Generation (`server/api/digital-cards/generate.ts`)

```typescript
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export async function generateDigitalCard(membershipId: string, profile: any, organization: any) {
  // Generate unique card identifier
  const cardNumber = `${organization.slug.toUpperCase()}-${new Date().getFullYear()}-${uuidv4().substring(0, 8)}`;
  
  // Create QR code data (encoded verification payload)
  const qrData = JSON.stringify({
    cardNumber,
    memberId: profile.id,
    organizationId: organization.id,
    membershipYear: new Date().getFullYear(),
    issued: new Date().toISOString()
  });
  
  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    width: 400,
    margin: 2,
    color: {
      dark: organization.primary_color || '#000000',
      light: '#FFFFFF'
    }
  });
  
  return {
    cardNumber,
    qrCodeData: qrData,
    qrCodeImage: qrCodeDataUrl
  };
}
```

#### 2.4 Implement Google Wallet Integration (`server/api/digital-cards/google-wallet.ts`)

```typescript
import { GoogleAuth } from 'google-auth-library';
import { jwt } from 'google-auth-library';

// Configuration - store these in environment variables
const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT || '{}');

export async function createGoogleWalletPass(card: any, profile: any, organization: any, membership: any) {
  const classId = `${ISSUER_ID}.${organization.slug}_membership`;
  const objectId = `${ISSUER_ID}.${card.cardNumber}`;
  
  // Define the pass class (template)
  const passClass = {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            oneItem: {
              item: {
                firstValue: {
                  fields: [
                    {
                      fieldPath: "object.textModulesData['member_name']"
                    }
                  ]
                }
              }
            }
          },
          {
            oneItem: {
              item: {
                firstValue: {
                  fields: [
                    {
                      fieldPath: "object.textModulesData['membership_type']"
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    },
    issuerName: organization.name,
    reviewStatus: 'UNDER_REVIEW'
  };
  
  // Define the pass object (individual card)
  const passObject = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    barcode: {
      type: 'QR_CODE',
      value: card.qrCodeData,
      alternateText: card.cardNumber
    },
    cardTitle: {
      defaultValue: {
        language: 'en-US',
        value: `${organization.name} Membership`
      }
    },
    header: {
      defaultValue: {
        language: 'en-US',
        value: 'MEMBER'
      }
    },
    textModulesData: [
      {
        id: 'member_name',
        header: 'Member Name',
        body: `${profile.first_name} ${profile.last_name}`
      },
      {
        id: 'membership_type',
        header: 'Membership Type',
        body: membership.membership_type
      },
      {
        id: 'valid_until',
        header: 'Valid Until',
        body: new Date(membership.end_date).toLocaleDateString()
      }
    ],
    hexBackgroundColor: organization.primary_color?.replace('#', '') || '3B82F6',
    logo: {
      sourceUri: {
        uri: organization.logo_url || 'https://via.placeholder.com/150'
      }
    }
  };
  
  // Create JWT for Google Wallet
  const credentials = {
    iss: SERVICE_ACCOUNT.client_email,
    aud: 'google',
    origins: ['www.example.com'],
    typ: 'savetowallet',
    payload: {
      genericObjects: [passObject]
    }
  };
  
  const token = jwt.sign(credentials, SERVICE_ACCOUNT.private_key, {
    algorithm: 'RS256'
  });
  
  return `https://pay.google.com/gp/v/save/${token}`;
}
```

#### 2.5 Implement Apple Wallet Integration (`server/api/digital-cards/apple-wallet.ts`)

```typescript
import { Pass } from 'apple-pass-js';
import fs from 'fs';
import path from 'path';

// Configuration - store these in environment variables
const PASS_TYPE_ID = process.env.APPLE_PASS_TYPE_ID;
const TEAM_ID = process.env.APPLE_TEAM_ID;

export async function createAppleWalletPass(card: any, profile: any, organization: any, membership: any) {
  // Load certificates (you'll need to upload these to your server)
  const certPath = process.env.APPLE_WALLET_CERT_PATH || './certs';
  
  const pass = new Pass({
    passTypeIdentifier: PASS_TYPE_ID,
    teamIdentifier: TEAM_ID,
    organizationName: organization.name,
    description: `${organization.name} Membership Card`,
    serialNumber: card.cardNumber,
    
    // Barcode for scanning
    barcodes: [{
      message: card.qrCodeData,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1'
    }],
    
    // Visual appearance
    backgroundColor: organization.primary_color || 'rgb(59, 130, 246)',
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(255, 255, 255)',
    
    // Card structure
    generic: {
      headerFields: [{
        key: 'member',
        label: 'MEMBER',
        value: `${profile.first_name} ${profile.last_name}`
      }],
      primaryFields: [{
        key: 'membership_type',
        label: 'Membership Type',
        value: membership.membership_type
      }],
      secondaryFields: [{
        key: 'card_number',
        label: 'Card Number',
        value: card.cardNumber
      }],
      auxiliaryFields: [{
        key: 'valid_until',
        label: 'Valid Until',
        value: new Date(membership.end_date).toLocaleDateString(),
        dateStyle: 'PKDateStyleShort'
      }],
      backFields: [{
        key: 'terms',
        label: 'Terms & Conditions',
        value: 'Visit our website for full terms and conditions.'
      }]
    }
  });
  
  // Add logo and icon
  if (organization.logo_url) {
    // Download and add logo (implement this based on your setup)
    pass.addBuffer('logo.png', logoBuffer);
    pass.addBuffer('logo@2x.png', logoBuffer2x);
    pass.addBuffer('icon.png', iconBuffer);
    pass.addBuffer('icon@2x.png', iconBuffer2x);
  }
  
  // Sign and generate pass
  const signedPass = await pass.sign({
    signerCert: fs.readFileSync(path.join(certPath, 'signerCert.pem')),
    signerKey: fs.readFileSync(path.join(certPath, 'signerKey.pem')),
    wwdr: fs.readFileSync(path.join(certPath, 'wwdr.pem')),
    signerKeyPassphrase: process.env.APPLE_WALLET_KEY_PASSPHRASE
  });
  
  return signedPass;
}
```

#### 2.6 Implement Scan Verification Endpoint (`server/api/digital-cards/scan.ts`)

```typescript
import { supabase } from '../../../lib/supabaseClient';

export async function verifyCardScan(qrCodeData: string) {
  try {
    const cardData = JSON.parse(qrCodeData);
    
    // Lookup the card in database
    const { data: card, error } = await supabase
      .from('digital_membership_cards')
      .select(`
        *,
        profiles!inner(first_name, last_name, email),
        memberships!inner(membership_type, start_date, end_date, status),
        organizations!inner(name, slug)
      `)
      .eq('card_number', cardData.cardNumber)
      .eq('is_active', true)
      .single();
    
    if (error || !card) {
      return { valid: false, message: 'Card not found' };
    }
    
    // Check if membership is still valid
    const now = new Date();
    const endDate = new Date(card.memberships.end_date);
    
    if (endDate < now) {
      return { 
        valid: false, 
        message: 'Membership expired',
        member: card.profiles
      };
    }
    
    if (card.memberships.status !== 'active') {
      return {
        valid: false,
        message: 'Membership not active',
        member: card.profiles
      };
    }
    
    // Update scan count
    await supabase
      .from('digital_membership_cards')
      .update({
        last_scanned_at: new Date().toISOString(),
        scan_count: card.scan_count + 1
      })
      .eq('id', card.id);
    
    return {
      valid: true,
      message: 'Valid membership',
      member: {
        name: `${card.profiles.first_name} ${card.profiles.last_name}`,
        email: card.profiles.email,
        membershipType: card.memberships.membership_type,
        validUntil: card.memberships.end_date
      },
      scanCount: card.scan_count + 1
    };
    
  } catch (error) {
    return { valid: false, message: 'Invalid QR code format' };
  }
}
```

---

### Phase 3: Frontend Implementation (2-3 hours)

#### 3.1 Create Digital Cards Component

Create `src/components/dashboard/DigitalCards.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Smartphone, Download, QrCode, CheckCircle } from 'lucide-react';

interface DigitalCardsProps {
  profile: any;
  membership: any;
  organization: any;
}

export default function DigitalCards({ profile, membership, organization }: DigitalCardsProps) {
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchCard();
  }, [membership?.id]);

  const fetchCard = async () => {
    if (!membership?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('digital_membership_cards')
        .select('*')
        .eq('membership_id', membership.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCard(data);
    } catch (error) {
      console.error('Error fetching card:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCard = async () => {
    setGenerating(true);
    try {
      // Call your API endpoint to generate card
      const response = await fetch('/api/digital-cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId: membership.id,
          profileId: profile.id,
          organizationId: organization.id
        })
      });

      const data = await response.json();
      setCard(data);
    } catch (error) {
      console.error('Error generating card:', error);
    } finally {
      setGenerating(false);
    }
  };

  const addToGoogleWallet = async () => {
    if (!card?.google_wallet_url) return;
    window.open(card.google_wallet_url, '_blank');
  };

  const addToAppleWallet = async () => {
    if (!card?.apple_wallet_url) return;
    window.location.href = card.apple_wallet_url;
  };

  if (loading) {
    return <div>Loading digital card...</div>;
  }

  if (!card) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generate Your Digital Membership Card</CardTitle>
          <CardDescription>
            Create a digital card to add to your mobile wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateCard} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Card'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Digital Membership Card
        </CardTitle>
        <CardDescription>
          Add your membership card to your mobile wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Code Display */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              <h3 className="font-medium">Your Membership QR Code</h3>
            </div>
            <div className="flex justify-center p-4 bg-white rounded">
              <img 
                src={card.qr_code_image} 
                alt="Membership QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-xs text-gray-600 text-center">
              Card Number: {card.card_number}
            </p>
            <p className="text-xs text-gray-600 text-center">
              Show this at events for quick check-in
            </p>
          </div>

          {/* Wallet Options */}
          <div className="space-y-4">
            {/* Google Wallet */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">Google Wallet</h3>
              </div>
              <p className="text-sm text-gray-600">
                Add to Google Wallet for easy access on Android devices
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={addToGoogleWallet}
                disabled={!card.google_wallet_url}
              >
                <Download className="h-4 w-4 mr-2" />
                Add to Google Wallet
              </Button>
            </div>

            {/* Apple Wallet */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-gray-800" />
                <h3 className="font-medium">Apple Wallet</h3>
              </div>
              <p className="text-sm text-gray-600">
                Add to Apple Wallet for easy access on iPhone
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={addToAppleWallet}
                disabled={!card.apple_wallet_url}
              >
                <Download className="h-4 w-4 mr-2" />
                Add to Apple Wallet
              </Button>
            </div>
          </div>
        </div>

        {/* Card Stats */}
        {card.scan_count > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 inline mr-1" />
              This card has been scanned {card.scan_count} time{card.scan_count !== 1 ? 's' : ''}
              {card.last_scanned_at && (
                <> • Last scan: {new Date(card.last_scanned_at).toLocaleDateString()}</>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 3.2 Update MemberDashboard to Enable Digital Cards

In `src/components/dashboard/MemberDashboard.tsx`, update the digital cards quick action card:

```typescript
// Change from:
<Card 
  className="hover:shadow-md transition-shadow opacity-60"
  data-testid="card-digital-cards"
  title="Digital cards feature coming soon"
>

// To:
<Card 
  className="hover:shadow-md transition-shadow cursor-pointer"
  onClick={() => setActiveView('digital-cards')}
  data-testid="card-digital-cards"
>
```

And add the view case:

```typescript
{activeView === 'digital-cards' && currentMembership && (
  <DigitalCards 
    profile={profile}
    membership={currentMembership}
    organization={organization}
  />
)}
```

---

### Phase 4: Admin Scanner Interface (1-2 hours)

Create `src/components/admin/CardScanner.tsx` for admins to verify cards:

```typescript
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Scan, CheckCircle, XCircle } from 'lucide-react';

export default function CardScanner() {
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = async (qrData: string) => {
    setScanning(true);
    try {
      const response = await fetch('/api/digital-cards/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeData: qrData })
      });
      
      const result = await response.json();
      setScanResult(result);
    } catch (error) {
      setScanResult({ valid: false, message: 'Scan failed' });
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Membership Card Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Scan a member's QR code to verify their membership status
        </p>

        {/* Add QR scanner component here - recommend using react-qr-reader */}
        <Button onClick={() => {/* Trigger QR scanner */}}>
          <Scan className="h-4 w-4 mr-2" />
          Start Scanner
        </Button>

        {/* Display scan result */}
        {scanResult && (
          <div className={`p-4 rounded-lg border-2 ${
            scanResult.valid 
              ? 'bg-green-50 border-green-500' 
              : 'bg-red-50 border-red-500'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {scanResult.valid ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <span className="font-semibold text-lg">
                {scanResult.message}
              </span>
            </div>
            
            {scanResult.member && (
              <div className="text-sm space-y-1">
                <p><strong>Name:</strong> {scanResult.member.name}</p>
                <p><strong>Email:</strong> {scanResult.member.email}</p>
                {scanResult.member.membershipType && (
                  <p><strong>Type:</strong> {scanResult.member.membershipType}</p>
                )}
                {scanResult.member.validUntil && (
                  <p><strong>Valid Until:</strong> {new Date(scanResult.member.validUntil).toLocaleDateString()}</p>
                )}
                {scanResult.scanCount && (
                  <p className="text-gray-600 mt-2">
                    Previous scans: {scanResult.scanCount - 1}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Configuration Checklist

### Environment Variables

Add these to your `.env` file:

```bash
# Google Wallet
GOOGLE_WALLET_ISSUER_ID=your_issuer_id_here
GOOGLE_WALLET_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

# Apple Wallet
APPLE_PASS_TYPE_ID=pass.com.yourorg.membership
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_WALLET_CERT_PATH=./certs
APPLE_WALLET_KEY_PASSPHRASE=your_passphrase
```

### Supabase Secrets

Add these secrets in Supabase Dashboard → Project Settings → API:
- `GOOGLE_WALLET_ISSUER_ID`
- `GOOGLE_WALLET_SERVICE_ACCOUNT`
- `APPLE_PASS_TYPE_ID`
- `APPLE_TEAM_ID`

---

## Testing Checklist

- [ ] Database tables created successfully
- [ ] RLS policies working correctly
- [ ] QR code generation produces valid codes
- [ ] Google Wallet pass can be added on Android
- [ ] Apple Wallet pass can be added on iPhone
- [ ] QR scanner verifies cards correctly
- [ ] Expired memberships show as invalid
- [ ] Scan count increments properly
- [ ] Cards display member information correctly
- [ ] Organization branding appears correctly

---

## Security Considerations

1. **QR Code Security**: Include timestamp and signature to prevent replay attacks
2. **Certificate Storage**: Store Apple certificates securely (use environment variables, not committed files)
3. **Service Account**: Restrict Google service account permissions to minimum required
4. **Rate Limiting**: Add rate limiting to scan endpoint to prevent abuse
5. **Audit Logging**: Log all card generations and scans for security monitoring

---

## Estimated Timeline

| Phase | Time | Difficulty |
|-------|------|-----------|
| Database Setup | 15 min | Easy |
| Backend APIs | 2-3 hours | Medium |
| Frontend Components | 2-3 hours | Medium |
| Admin Scanner | 1-2 hours | Easy |
| Wallet Setup & Testing | 2-4 hours | Hard |
| **Total** | **7-12 hours** | **Medium** |

---

## Resources

### Google Wallet
- [Google Wallet API Documentation](https://developers.google.com/wallet)
- [Generic Pass Type Reference](https://developers.google.com/wallet/generic/use-cases/generic-use-case)
- [Google Cloud Console](https://console.cloud.google.com)

### Apple Wallet
- [PassKit Documentation](https://developer.apple.com/documentation/passkit)
- [Pass Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/wallet)
- [PassKit Package Format](https://developer.apple.com/library/archive/documentation/UserExperience/Reference/PassKit_Bundle/Chapters/Introduction.html)

### QR Codes
- [qrcode npm package](https://www.npmjs.com/package/qrcode)
- [react-qr-reader](https://www.npmjs.com/package/react-qr-reader) for scanning

---

## Troubleshooting

### Google Wallet Issues
- **"Save to Google Wallet" button doesn't work**: Check service account permissions
- **Pass doesn't display correctly**: Verify JSON structure matches Google's specification
- **Authentication error**: Regenerate service account key

### Apple Wallet Issues
- **Pass won't install**: Check certificate expiration and Team ID
- **Visual issues**: Review pass.json structure and image sizes
- **Signature invalid**: Ensure WWDR certificate is up to date

### QR Code Issues
- **QR code won't scan**: Increase size and contrast
- **Invalid data**: Check JSON encoding and special characters
- **Scan verification fails**: Verify database connection and card lookup logic

---

## Next Steps After Implementation

1. **Automated Card Generation**: Trigger card generation automatically when membership is approved
2. **Push Notifications**: Send pass updates when membership is renewed
3. **Bulk Generation**: Admin tool to generate cards for all members
4. **Analytics Dashboard**: Track card adoption rates and scan statistics
5. **Custom Branding**: Allow organizations to customize card design and colors
