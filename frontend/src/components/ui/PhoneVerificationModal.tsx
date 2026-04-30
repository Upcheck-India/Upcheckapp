import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { Input } from './Input';
import { theme } from '../../theme';
import { useTruecallerAuth } from '../../hooks/useTruecallerAuth';

type VerificationStep = 'phone' | 'waiting_call' | 'name_input' | 'verifying';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const PhoneVerificationModal = ({ visible, onClose }: Props) => {
  const [phone, setPhone] = useState('');
  const [countryCode] = useState('IN');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<VerificationStep>('phone');

  const {
    verificationStep,
    ttl,
    requestMissedCallVerification,
    verifyMissedCall,
    resetVerification,
  } = useTruecallerAuth();

  const validatePhone = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const validateName = () => {
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return false;
    }
    return true;
  };

  const handleRequestVerification = async () => {
    if (!validatePhone()) return;
    setError(null);

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

    try {
      const result = await requestMissedCallVerification(countryCode, formattedPhone);

      if (result.success) {
        setStep('waiting_call');
      } else {
        setError(result.error || 'Failed to initiate verification');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send verification');
    }
  };

  const handleMissedCallReceived = () => {
    setStep('name_input');
  };

  const handleVerifyMissedCall = async () => {
    if (!validateName()) return;
    setError(null);

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

    try {
      const result = await verifyMissedCall(firstName.trim(), lastName.trim(), formattedPhone);

      if (result.success) {
        handleClose();
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    }
  };

  const handleRetry = () => {
    setStep('phone');
    setError(null);
    resetVerification();
  };

  const handleClose = () => {
    setPhone('');
    setFirstName('');
    setLastName('');
    setStep('phone');
    setError(null);
    resetVerification();
    onClose();
  };

  const isWaitingForCall = step === 'waiting_call';
  const missedCallReceived = verificationStep === 'missed_call_received';

  React.useEffect(() => {
    if (missedCallReceived && isWaitingForCall) {
      handleMissedCallReceived();
    }
  }, [missedCallReceived, isWaitingForCall]);

  const getStepTitle = () => {
    switch (step) {
      case 'phone': return 'Verify Phone Number';
      case 'waiting_call': return 'Waiting for Missed Call...';
      case 'name_input': return 'Confirm Your Details';
      case 'verifying': return 'Verifying...';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 'phone': return "We'll verify your number using Truecaller's missed call verification";
      case 'waiting_call': return `A missed call will be placed to ${phone}${ttl !== null ? ` (${ttl}s remaining)` : ''}`;
      case 'name_input': return 'Missed call received! Enter your details to complete verification';
      case 'verifying': return 'Confirming your phone number...';
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case 'phone': return 'phone-check';
      case 'waiting_call': return 'phone-ring';
      case 'name_input': return 'check-circle';
      case 'verifying': return 'progress-check';
    }
  };

  const getIconColor = () => {
    switch (step) {
      case 'phone': return '#0087D0';
      case 'waiting_call': return '#FF9800';
      case 'name_input': return '#4CAF50';
      case 'verifying': return '#2196F3';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <MaterialCommunityIcons name="close" size={24} color={theme.roles.light.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <MaterialCommunityIcons name={getStepIcon()} size={48} color={getIconColor()} />
            <Text style={styles.title}>{getStepTitle()}</Text>
            <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {step === 'phone' && (
            <View style={styles.form}>
              <Input
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                leftIcon="phone"
                required
              />

              <Button
                title="Send Verification Code"
                onPress={handleRequestVerification}
                style={styles.submitBtn}
              />
            </View>
          )}

          {step === 'waiting_call' && (
            <View style={styles.form}>
              <View style={styles.waitingContainer}>
                {ttl !== null && (
                  <View style={styles.ttlContainer}>
                    <Text style={styles.ttlText}>{ttl}s</Text>
                  </View>
                )}
                <Text style={styles.waitingText}>
                  Truecaller is placing a missed call to verify your number.
                  Please wait for the call and do not answer it.
                </Text>
              </View>

              <Button
                title="Retry"
                onPress={handleRetry}
                variant="outlined"
                style={styles.submitBtn}
              />
            </View>
          )}

          {step === 'name_input' && (
            <View style={styles.form}>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter your first name"
                leftIcon="account"
                required
              />

              <Input
                label="Last Name (Optional)"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter your last name"
                leftIcon="account-outline"
              />

              <Button
                title="Verify & Sign In"
                onPress={handleVerifyMissedCall}
                style={styles.submitBtn}
              />
            </View>
          )}

          {step === 'verifying' && (
            <View style={styles.form}>
              <View style={styles.waitingContainer}>
                <MaterialCommunityIcons name="progress-check" size={40} color="#2196F3" />
                <Text style={styles.waitingText}>
                  Verifying your phone number...
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.note}>
            Truecaller will verify your number using a missed call. No charges apply.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.roles.light.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[6],
    paddingBottom: theme.spacing[8],
    maxHeight: '80%',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: theme.spacing[2],
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  title: {
    ...theme.typeScale.h3,
    color: theme.roles.light.textPrimary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    ...theme.typeScale.bodyMedium,
    color: theme.roles.light.textSecondary,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: theme.roles.light.dangerBg,
    borderRadius: theme.radius.sm,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[4],
    borderLeftWidth: 3,
    borderLeftColor: theme.roles.light.dangerText,
  },
  errorText: {
    ...theme.typeScale.bodySmall,
    color: theme.roles.light.dangerText,
  },
  form: {
    marginBottom: theme.spacing[4],
  },
  submitBtn: {
    marginTop: theme.spacing[4],
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
    gap: theme.spacing[4],
  },
  ttlContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  ttlText: {
    ...theme.typeScale.h3,
    color: '#E65100',
    fontWeight: '700',
  },
  waitingText: {
    ...theme.typeScale.bodyMedium,
    color: theme.roles.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  note: {
    ...theme.typeScale.labelSmall,
    color: theme.roles.light.textDisabled,
    textAlign: 'center',
    marginTop: theme.spacing[4],
  },
});
