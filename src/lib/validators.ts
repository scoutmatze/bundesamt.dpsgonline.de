import { z } from "zod";

export const profileSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  street: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  bank: z.string().optional(),
  accountHolder: z.string().optional(),
  kmRate: z.number().min(0).max(1).default(0.20),
});

export const tripSchema = z.object({
  purpose: z.string().min(1, "Reisezweck ist erforderlich"),
  route: z.string().optional(),
  startDate: z.string().min(1, "Reisebeginn ist erforderlich"),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  travelMode: z.enum(["BAHN", "PRIVAT_PKW", "DIENSTWAGEN", "FLUGZEUG", "FAHRRAD", "MIETWAGEN"]).default("BAHN"),
  pkwReason: z.string().optional(),
  licensePlate: z.string().optional(),
});

export const receiptSchema = z.object({
  description: z.string().optional(),
  amount: z.number().positive("Betrag muss positiv sein"),
  date: z.string().min(1, "Datum ist erforderlich"),
  category: z.enum(["FAHRT", "UNTERKUNFT", "VERPFLEGUNG", "NEBENKOSTEN"]),
  fromStation: z.string().optional(),
  toStation: z.string().optional(),
  isHandyticket: z.boolean().default(false),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type TripInput = z.infer<typeof tripSchema>;
export type ReceiptInput = z.infer<typeof receiptSchema>;
