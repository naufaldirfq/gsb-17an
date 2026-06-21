import { z } from "zod";

const phoneRegex = /^(?:\+62|08)[0-9]{7,13}$/;

export const registerSchema = z.object({
  competitionId: z.string().min(1),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  houseBlock: z.string().min(1, "Blok rumah wajib diisi"),
  houseNumber: z.string().min(1, "Nomor rumah wajib diisi"),
  phone: z.string()
    .regex(phoneRegex, "Nomor HP harus diawali dengan 08 atau +62")
    .transform((val) => {
      // Normalize to 08... format
      if (val.startsWith("+62")) {
        return "0" + val.slice(3);
      }
      return val;
    }),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
