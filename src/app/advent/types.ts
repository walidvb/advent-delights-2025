export interface Track {
  dayIndex: number;
  title: string;
  description: string;
  author: string;
  color: string;
  disabled: boolean;
}

export interface CSVRow {
  Title: string;
  Description: string;
  Author: string;
  Color: string;
}

export interface Participant {
  name: string;
}
