import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { Input } from './Input';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const PhoneVerificationModal = ({ visible, onClose }: Props) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);
  const { isLoading, truecallerLogin } = useAuthStore();

  const validatePhone = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validatePhone()) return;
    setError(null);

    try {
      // Format phone with country code if needed
      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`;

      // Call backend to send OTP via Truecaller missed call or SMS
      // For now, we'll just proceed to OTP step
      // In production, this would call: authApi.sendPhoneOtp(formattedPhone)

      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }
    setError(null);

    try {
      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`;

      // Verify OTP and login
      await truecallerLogin({
        accessToken: otp, // OTP acts as verification token
        phoneNumber: formattedPhone,
        firstName: 'User',
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    }
  };

  const handleClose = () => {
    setPhone('');
    setOtp('');
    setStep('phone');
    setError(null);
    onClose();
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
            <MaterialCommunityIcons name="phone-check" size={48} color="#0087D0" />
            <Text style={styles.title}>
              {step === 'phone' ? 'Verify Phone Number' : 'Enter OTP'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'We\'ll verify your phone number using Truecaller\'s missed call verification'
                : `Enter the OTP sent to ${phone}`}
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {step === 'phone' ? (
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
                onPress={handleSendOtp}
                loading={isLoading}
                style={styles.submitBtn}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label="OTP Code"
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
                leftIcon="lock"
                required
              />

              <Button
                title="Verify & Sign In"
                onPress={handleVerifyOtp}
                loading={isLoading}
                style={styles.submitBtn}
              />

              <Button
                title="Resend OTP"
                onPress={handleSendOtp}
                variant="text"
                disabled={isLoading}
              />
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
  note: {
    ...theme.typeScale.labelSmall,
    color: theme.roles.light.textDisabled,
    textAlign: 'center',
    marginTop: theme.spacing[4],
  },
});